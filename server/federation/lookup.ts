import { ofetch } from 'ofetch'
import { _signAndSend } from './sign_and_send'
import { useLogger } from '../lib/logger'
import { APKey, APUser, Instance } from '../services/db'
import { getActor } from './get_actor'

const log = useLogger('federation')

/**
 * https://swicg.github.io/activitypub-http-signature/#how-to-obtain-a-signature-s-public-key
 */
export async function getActorFromKeyId(keyId: string, retry: boolean = false, bypassCache: boolean = false) {
  log.debug(`getActorFromKeyId for ${keyId}`)
  // it should be an URL
  const url = new URL(keyId)

  // search it locally
  let actor
  if (!bypassCache) {
    actor = await APUser.findOne({ include: [{ model: APKey, where: { ap_id: keyId }, required: true }] })
    if (actor) {
      return { actor: actor, key: actor.keys![0]! }
    }
  }

  log.info('Key %s not found locally', keyId)
  // refetch actor and retry
  // if not found, fetch it from the network (discarding its fragment first if necessary)
  url.hash = ''
  actor = await getActor(url.href)
  if (actor && !retry) {
    return getActorFromKeyId(keyId, true)
  }
}

export async function getNodeInfo(instance_url: string): Promise<{ applicationActor: APUser, nodeInfo: object } | undefined> {
  let nodeInfo = await ofetch(`${instance_url}/.well-known/nodeinfo`, { headers: { Accept: 'application/json' } })
    .catch(e => {
      log.debug('Node %s does not support nodeInfo', instance_url)
      throw e
    })

  if (Array.isArray(nodeInfo?.links)) {
    log.info('.well-known/nodeinfo with links!')
    const supportedVersion = nodeInfo.links.find((l: { rel?: string }) => l?.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.1' || l?.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.0')
    if (!supportedVersion) {
      log.info('No nodeinfo version supported for instance %s -> %s (supported versions 2.0 or 2.1)', instance_url, nodeInfo.links)
    }
    const applicationActor = nodeInfo.links.find((l: { rel?: string }) => l?.rel === 'https://www.w3.org/ns/activitystreams#Application')
    if (applicationActor) {
      log.debug('application actor url: ', applicationActor)
    }
    nodeInfo = await ofetch(supportedVersion?.href)
    log.debug('getNodeInfo "%s", applicationActor: %s, nodeInfo: %s', instance_url, applicationActor?.href, nodeInfo)

    if (nodeInfo) {
      return { applicationActor: applicationActor?.href, nodeInfo }
    }
  }
}

export async function getInstance(actor_url: string, force = false) {
  log.debug(`getInstance for ${actor_url}`)
  const url = new URL(actor_url)
  const domain = url.host
  const instance_url = `${url.protocol}//${url.host}`
  let instance
  if (!force) {
    instance = await Instance.findByPk(domain)
    if (instance) {
      log.debug('Use cached instance: %s', instance.name)
      return instance
    }
  }

  try {
    const { applicationActor, nodeInfo } = await getNodeInfo(instance_url)
    const [instance] = await Instance.upsert({
      name: nodeInfo?.metadata?.nodeName ?? domain,
      domain,
      data: nodeInfo ?? {},
      blocked: false,
      applicationActor
    })
    log.debug('[FEDI] Create a new instance from %s: %s %s', instance_url, instance.name, nodeInfo)
    return instance
  } catch (e) {
    const [instance] = await Instance.upsert({
      name: domain,
      domain,
      data: '',
      blocked: false,
      applicationActor: undefined
    })
    log.info('nodeInfo not supported for "%s": %s', instance_url, e?.response?.data ?? String(e))
    return instance
  }
}
