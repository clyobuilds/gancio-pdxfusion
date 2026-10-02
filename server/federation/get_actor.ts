import { useLogger } from '../lib/logger'
import { secretSettings } from '../services/settings'
import { sanitizeHTML } from '../helpers'
import { _signAndSend } from './sign_and_send'
import { Instance, APUser } from '../services/db'

import { getInstance } from './lookup'
import { importActorKeys } from './keys'

const log = useLogger('federation')

// force an update of the actor if it is older than 1 week
const MAX_TTL = 60 * 60 * 24 * 7 // 1 week

/**
 * Get an Actor from a URL using GET HTTP Signature.
 * @param actorUrl - The URL of the Actor to get.
 * @param bypassCache - bypass the cache and make a fresh request.
 * @returns The APUser representing the Actor, or undefined if not found.
 */
export async function getActor(actorUrl: string, bypassCache = false): Promise<APUser | undefined> {
  log.debug(`[FEDI] getActor for ${actorUrl}`)
  let fedi_user

  // try with cache first
  if (!bypassCache) {
    fedi_user = await APUser.findByPk(actorUrl, { include: { model: Instance, required: true } }) as APUser & { instance: Instance }
    if (fedi_user && fedi_user.updatedAt && (Date.now() - fedi_user.updatedAt.getTime()) < MAX_TTL) {
      return fedi_user
    }
  }

  try {
    const ret = await _signAndSend('', actorUrl, 'get', secretSettings.privateKey)
    if (!ret?.id) {
      log.debug('getActor failed for %s', actorUrl)
      return
    }

    if (!['Application', 'Group', 'Organization', 'Person', 'Service'].includes(ret?.type)) {
      log.debug('getActor failed for %s, invalid type %s', actorUrl, ret?.type)
      return
    }

    if (ret) {
      const instance = await getInstance(actorUrl, false)
      log.info('[FEDI] Create/Update a new AP User "%s" and associate it to instance "%s"', ret.id, instance?.domain)
      try {
        ([fedi_user] = await APUser.upsert({
          ap_id: ret.id,
          object: { ...ret, summary: sanitizeHTML(ret?.summary ?? '') },
          instanceDomain: instance.domain ?? new URL(actorUrl).origin,
          blocked: false
        }))

        await importActorKeys(ret)
        await fedi_user.setInstance(instance)
        return fedi_user
      } catch (e) {
        log.debug('[FEDI] Error in update/create ', e)
      }
    }
  } catch (e) {
    log.debug('getActor failed for %s, %s', actorUrl, e)
  }
  return
}