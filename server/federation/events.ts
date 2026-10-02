import { DateTime } from 'luxon'
import type { CreationAttributes } from '@sequelize/core'
import { useLogger } from '../lib/logger'
import { publicSettings } from '~~/server/services/settings'
import { type APUser, type Media, Event } from '~~/server/services/db'
import { eventToAP } from '../services/events'
import { APContext, getFollowersInbox } from './helpers'
import { signAndSend } from './sign_and_send'
import { APEventSchema, type APEvent } from './types'
import { getImageFromURL, sanitizeHTML } from '../helpers'
import { parseAPLocation } from './places'
import { findOrCreatePlace } from '../services/places'
import { findOrCreateTags } from '../services/tags'
import type { ActivityHandlerResult } from './handlers'

const log = useLogger('Federated Event')

/**
 * send a Create, Update, Delete or Announce activity for an Event to our followers (using sharedInbox when possible)
 */
export async function sendEvent(event: Event, type: 'Create' | 'Update' | 'Announce' | 'Delete' = 'Create') {
  const recipients = await getFollowersInbox()
  if (!recipients) return

  for (const sharedInbox in recipients) {
    if (!recipients[sharedInbox]?.length) continue
    log.debug(`Notify ${sharedInbox} with event ${event.title} cc => ${recipients[sharedInbox]?.length}`)
    const body = await buildEventActivity(event, recipients[sharedInbox], type)

    signAndSend(body, sharedInbox)
  }
}

export async function buildEventActivity(event: Event, recipients: string[],
  type: 'Create' | 'Update' | 'Announce' | 'Delete' = 'Create') {
  return {
    '@context': APContext,
    'id': `${publicSettings.baseurl}/federation/m/${event.id}#${type}-${event.updatedAt.getTime()}`,
    type,
    'to': ['https://www.w3.org/ns/activitystreams#Public'],
    'cc': recipients,
    'actor': `${publicSettings.baseurl}/federation/u/${publicSettings.instance_name}`,
    'object': eventToAP(event)
  }
}

export async function APEventToEvent(APEvent: APEvent, actor: APUser) {
  const { place, online_locations } = await parseAPLocation(APEvent).catch(_e => ({ place: undefined, online_locations: undefined }))

  let media: Media[] = []
  if (Array.isArray(APEvent.attachment)) {
    media = await Promise.all(APEvent.attachment.filter((att) => {
      return typeof att?.url === 'string' &&
        ['Image', 'Document'].includes(att?.type) &&
        att.mediaType?.startsWith?.('image/')
    }).map((att) => {
      log.debug('[FEDI] Download attachment for event %s', att.url)
      const focalPoint = att.focalPoint?.length === 2 ? att.focalPoint as [number, number] : undefined
      return getImageFromURL(
        att.url as string,
        (att.name || APEvent.name).trim() || '',
        focalPoint
      )
    }))
  }

  const event: CreationAttributes<Event> = {
    title: APEvent.name.trim(),
    start_datetime: DateTime.fromISO(APEvent.startTime).toUnixInteger(),
    end_datetime: APEvent.endTime ? DateTime.fromISO(APEvent.endTime).toUnixInteger() : undefined,
    is_visible: true,
    ...(online_locations && { online_locations }),
    // tag: APEvent.tag?.filter(t => t?.type === 'Hashtag').map(t => t.name) ?? [],
    ap_id: APEvent.id,
    media,
    description: sanitizeHTML(APEvent?.content ?? APEvent?.summary ?? ''),
    status: APEvent.eventStatus,
    apUserApId: actor.ap_id,
    ap_object: APEvent
  }
  const tags: string[] = APEvent.tag?.filter(t => t?.type === 'Hashtag').map(t => t.name) ?? []

  // if (APEvent?.location) {
  log.debug(`Parsing location for event ${APEvent.name}: ${JSON.stringify(APEvent.location)}`)
  // }

  return { event, tags, place }
}

export async function handleCreateEvent(object: APEvent, actor: APUser): Promise<ActivityHandlerResult> {
  // only trusted actor could send events
  if (!actor.following || !actor.trusted) {
    return { status: 'ignored', reason: 'Actor not followed or not trusted' }
  }

  const { success, data, error } = APEventSchema.safeParse(object)
  if (!success) {
    return { status: 'ignored', reason: 'Bad Event format: ' + String(error) }
  }

  const ap_id = data.id
  const exists = await Event.findOne({ where: { ap_id } })
  if (exists) {
    return { status: 'ignored', reason: `Event ${ap_id} already exists (${publicSettings.baseurl}/event/${exists.slug})` }
  }

  // transform APEvent to Event and save to database (in a better world the schema should be the same as APEvent, but for now we just transform it here)
  const { event, tags, place } = await APEventToEvent(data, actor)
  const dbTags = await findOrCreateTags(tags)
  const dbEvent = await Event.create(event)

  if (event.media) {
    log.debug(`Event ${event.title} has media attachments: ${JSON.stringify(event.media)}`)
  }

  if (place) {
    const dbPlace = await findOrCreatePlace(place)
    if (dbPlace) {
      dbEvent.setPlace(dbPlace)
    }
  }
  dbEvent.setTags(dbTags)
  return { status: 'accepted' }
}

/**
 * an Update > Event from remote actor
 * we should fail if the actor is different from the original event actor
 */
export async function handleUpdateEvent(message: APEvent, actor: APUser): Promise<ActivityHandlerResult> {
  const { success, data, error } = APEventSchema.safeParse(message)
  if (!success) {
    log.debug(error)
    return { status: 'ignored', reason: 'Bad Event format ' + error }
  }

  const ap_id = data.id
  const event = await Event.findOne({ where: { ap_id } })
  if (!event) {
    return { status: 'ignored', reason: `Event ${ap_id} not found` }
  }

  if (event.apUserApId !== actor.ap_id) {
    return { status: 'ignored', reason: `Event actor is not the original event actor ${actor.ap_id} !== ${event.apUserApId}` }
  }

  // transform APEvent to Event and save to database (in a better world the schema should be the same as APEvent, but for now we just transform it here)
  const { event: eventData, tags, place } = await APEventToEvent(data, actor)
  const dbTags = await findOrCreateTags(tags)
  const dbEvent = await event.update(eventData)

  if (event.media) {
    log.debug(`Event ${event.title} has media attachments: ${JSON.stringify(event.media)}`)
  }

  if (place) {
    const dbPlace = await findOrCreatePlace(place)
    if (dbPlace) {
      dbEvent.setPlace(dbPlace)
    }
  }
  dbEvent.setTags(dbTags)
  return { status: 'accepted' }
}
