import { DateTime } from 'luxon'
import { _signAndSend, signAndSend } from './sign_and_send'
import { useLogger } from '../lib/logger'
import { publicSettings, publicSettingsLastModified, secretSettings } from '~~/server/services/settings'
import { APUser } from '../services/db'
import { APActivityTypeSchema, type APActivityBase } from './types'
import { handleActivity } from './handlers'
import emitter from '../lib/emitter'
import type { Settings } from '~~/shared/types/settings'

const log = useLogger('federation')

export const applicationActorBaseUrl = `${publicSettings.baseurl}/federation/u/`
export const applicationActorId = `${applicationActorBaseUrl}${publicSettings.instance_name}`
export const isApplicationActor = (actorId: string) => actorId === applicationActorId

export function sameOrigin(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1)
    const u2 = new URL(url2)
    return u1.origin === u2.origin
  } catch (e) {
    log.warn('sameOrigin: invalid URL(s): %s, %s (%s)', url1, url2, e)
    return false
  }
}

/**
 * returns the list of actor ids in the to or cc fields of an activity
 */
export function targetsForActivity(activity: APActivityBase): string[] {
  const targets = new Set<string>()
  if (activity.to) activity.to.forEach(t => targets.add(t))
  if (activity.cc) activity.cc.forEach(t => targets.add(t))
  return [...targets]
}

/**
 * there is a public target
 */
export function hasPublicTarget(targets: string[]): boolean {
  return targets.some(target => ['as:Public', 'https://www.w3.org/ns/activitystreams#Public'].includes(target))
}

export async function dereferenceActivityObject(object: unknown): Promise<unknown | undefined> {
  if (typeof object !== 'string') {
    return object
  }

  // TODO: should probably check if this object is already in database (Note or Event) or cache this
  const ret = await _signAndSend('', object, 'get', secretSettings.privateKey)
  if (!ret || typeof ret !== 'object' || !('id' in ret) || typeof ret.id !== 'string' || ret.id !== object) {
    return undefined
  }

  return ret
}

function _getUser() {
  const name = publicSettings?.instance_name ?? publicSettings.title
  const baseurl = publicSettings.baseurl
  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1',
      {
        toot: 'http://joinmastodon.org/ns#',

        // A property-value pair, e.g. representing a feature of a product or place. We use this to publish this very same instance
        // https://docs.joinmastodon.org/spec/activitypub/#PropertyValue
        schema: 'http://schema.org#',
        PropertyValue: 'schema:PropertyValue',
        value: 'schema:value',

        // https://docs.joinmastodon.org/spec/activitypub/#discoverable
        discoverable: 'toot:discoverable',

        indexable: 'toot:indexable'
      }
    ],
    'id': `${baseurl}/federation/u/${name}`,
    'type': 'Application',
    'name': publicSettings.title,
    'preferredUsername': name,
    'inbox': `${baseurl}/federation/u/${name}/inbox`,
    'outbox': `${baseurl}/federation/u/${name}/outbox`,
    'manuallyApprovesFollowers': false,
    'endpoints': { sharedInbox: `${baseurl}/federation/u/${name}/inbox` },
    'discoverable': true,
    'indexable': true,
    'attachment': [
      {
        type: 'PropertyValue',
        name: 'Website',
        value: `<a href='${baseurl}'>${baseurl}</a>`
      }
    ],
    'icon': {
      type: 'Image',
      mediaType: 'image/png',
      url: `${baseurl}/logo.png?last_update=${publicSettingsLastModified.logo?.getTime() ?? 0}`
    },
    'image': {
      type: 'Image',
      mediaType: 'image/png',
      url: `${baseurl}/headerimage.png?last_update=${publicSettingsLastModified.header_image?.getTime() ?? 0}`
    },
    'summary': publicSettings.description,
    'publicKey': {
      id: `${baseurl}/federation/u/${name}#main-key`,
      owner: `${baseurl}/federation/u/${name}`,
      publicKeyPem: publicSettings.publicKey
    },
    'url': `${baseurl}/federation/u/${name}`
  }
}

emitter.on('settings:updated', ({ key }: { key: keyof Settings }) => {
  // when changing this we have to update the actor
  if (['description', 'logo', 'header_image', 'title'].includes(key)) {
    updateActor()
  }
})
export async function updateActor() {
  if (!publicSettings.enable_federation) {
    log.info('[FEDI] Federation is disabled')
    return
  }

  const followers = await APUser.findAll({ where: { follower: true } })
  log.debug('[FEDI] Sending to %d followers: [%s]', followers.length, followers.map(f => f.ap_id).join(', '))
  const recipients: Record<string, string[]> = {}
  followers.forEach((follower) => {
    const sharedInbox = follower?.object?.endpoints?.sharedInbox ?? follower?.object?.inbox
    if (!recipients[sharedInbox]) {
      recipients[sharedInbox] = []
    }
    recipients[sharedInbox].push(follower.ap_id)
  })

  for (const sharedInbox in recipients) {
    log.debug(`Notify ${sharedInbox} with actor update cc => ${recipients[sharedInbox]?.length}`)
    const body = {
      id: `${publicSettings.baseurl}/federation/m/actor#update-${DateTime.local().toMillis()}`,
      type: 'Update' as const,
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      cc: recipients[sharedInbox],
      actor: `${publicSettings.baseurl}/federation/u/${publicSettings.instance_name}`,
      object: _getUser()
    }

    body['@context'] = body['object']['@context']
    signAndSend(body, sharedInbox)
  }
}

export async function getFollowersInbox() {
  const followers = await APUser.findAll({ where: { follower: true } })

  const recipients: Record<string, string[]> = {}
  for (const follower of followers) {
    const inbox = follower?.object?.endpoints?.sharedInbox ?? follower?.object?.inbox
    if (!inbox) continue
    if (!recipients[inbox]) recipients[inbox] = []
    recipients[inbox].push(follower.ap_id)
  }

  return recipients
}

export const APContext = [
  'https://www.w3.org/ns/activitystreams',
  // 'https://w3id.org/fep/8a8e',
  'https://schema.org',
  'https://w3id.org/security/v1',
  {
    toot: 'http://joinmastodon.org/ns#',

    // https://docs.joinmastodon.org/spec/activitypub/#Hashtag
    Hashtag: 'https://www.w3.org/ns/activitystreams#Hashtag',

    manuallyApprovesFollowers: 'as:manuallyApprovesFollowers',

    // focal point - https://docs.joinmastodon.org/spec/activitypub/#focalPoint
    focalPoint: {
      '@container': '@list',
      '@id': 'toot:focalPoint'
    }
  }
]

export async function followActor(actor: APUser) {
  log.debug(`[FEDI] Following actor ${actor.ap_id}`)
  const body = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    'id': `${publicSettings.baseurl}/federation/m/${actor.ap_id}#follow`,
    'type': 'Follow' as const,
    'actor': `${publicSettings.baseurl}/federation/u/${publicSettings.instance_name}`,
    'object': actor.ap_id
  }

  await signAndSend(body, actor.object.endpoints?.sharedInbox ?? actor.object.inbox)
  await actor.update({ following: true })

  log.info('After actor update following, get the outbox')
  // let's try to get remote outbox
  const activities = await getOutbox(actor)
  if (!activities?.length) {
    log.debug('[FEDI] No outbox activities for %s', actor.ap_id)
    return
  }

  log.info('Found some activities in outbox', activities.length)

  for (const activity of activities) {
    log.debug('Handle outbox activity %s from %s', activity.type, actor.ap_id)
    log.debug('Activity content: %s', JSON.stringify(activity, null, 2))
    const { success } = APActivityTypeSchema.safeParse(activity.type)
    if (!success) {
      log.warn('unknown activity `type` property: %s', activity.type)
      continue
    }

    const ret = await handleActivity(activity, { actor, key: { ap_id: '' } })
    if (ret.status !== 'accepted') {
      log.error('Error handling activity %s from %s', activity.type, actor.ap_id)
      log.error(ret.reason)
    }
  }
}

export async function getOutbox(actor: APUser) {
  log.debug('[FEDI] Get %s outbox: %s', actor?.ap_id, actor?.object?.outbox)

  if (!actor?.object?.outbox) return
  try {
    const collection = await _signAndSend('', actor?.object?.outbox, 'get', secretSettings.privateKey)
    // embedded collection
    if (typeof collection?.first !== 'string') {
      return collection?.first?.orderedItems ?? []
    } else if (isUrl(collection?.first)) {
      return getOutboxPaginated(collection?.first)
    }
  } catch (e) {
    log.warn('[FEDI] getOutbox %s failed: %s', actor.ap_id, e)
    return []
  }
}

async function getOutboxPaginated<Outbox = unknown>(
  initialUrl: string,
  {
    maxSoftLimit = 50,
    maxPages = 5
  } = {}
) {
  let outbox: Outbox[] = []

  let nextPageUrl = initialUrl
  let thereIsMoreContent
  let pageCount = 0

  // Always get at least the first page, independently of the "soft limit"
  do {
    const collection = await _signAndSend('', nextPageUrl, 'get', secretSettings.privateKey)
    thereIsMoreContent = false
    if (Array.isArray(collection?.orderedItems) && collection.orderedItems.length) {
      outbox = [...outbox, ...collection.orderedItems]
      if (isUrl(collection.next) && collection.next !== nextPageUrl) {
        thereIsMoreContent = true
        nextPageUrl = collection.next
      }
    }
    pageCount++
  } while (thereIsMoreContent && outbox.length < maxSoftLimit && pageCount < maxPages)
  return outbox
}

const isUrl = (url: unknown) => typeof url === 'string' && /^https?:\/\//.test(url)

export async function unfollowActor(actor: APUser) {
  log.debug(`[FEDI] Unfollowing actor ${actor.ap_id}`)

  const object = {
    type: 'Follow' as const,
    id: `${publicSettings.baseurl}/federation/m/${actor.ap_id}#follow`,
    object: actor.ap_id
  }

  const body = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    'type': 'Undo' as const,
    'id': `${publicSettings.baseurl}/federation/m/${actor.ap_id}#unfollow`,
    'actor': `${publicSettings.baseurl}/federation/u/${publicSettings.instance_name}`,
    object
  }
  await signAndSend(body, actor.object.endpoints?.sharedInbox || actor.object.inbox)
  return actor.update({ following: false })
}
