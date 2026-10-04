import { DateTime } from 'luxon'
import type { InferAttributes, WhereOptions } from '@sequelize/core'
import { Op, literal, col, where, fn, sql, SQL_NULL } from '@sequelize/core'
import { useLogger } from '../lib/logger'
import { htmlToText } from 'html-to-text'
import { z } from 'zod'
import type { EventAPI, Media } from '~~/shared/types/generic'
import { type H3Event, createError } from 'h3'
import { createHash } from 'crypto'
import { Place, Tag, Event, Message, User, RecurrentSchema, type EventStatus } from './db'
import { publicSettings, secretSettings } from './settings'
import type { UserSession } from '../lib/session'
import { EventStatusEnum, PostalAddressSchema, type APAttachment, type APEvent, type APLocation, type APTag } from '../federation/types'
import { PlaceToAP } from '../federation/places'
import { handleCache } from '../lib/API'
import { findOrCreatePlace, placeToJSON } from './places'
import { getImageFromURL, sanitizeHTML } from '../helpers'
import linkifyHtml from 'linkify-html'
import { multipartFileSchema, saveUploadedEventImage } from '../lib/parseMultipartForm'
import { focalPointSchema, jsonCodec } from '../lib/validator'
import { addressToString } from '../../shared/utils/addressToString'
import { findOrCreateTags, normalizeTag } from './tags'
import type { Settings } from '~~/shared/types/settings'
import { createRecurrent, removeUpcomingOccurrences } from './recurrent'
import { sign } from '../federation/ldsignature'
import { notifyEvent } from './notifier'
import type { IntermediateRepresentation } from 'linkifyjs'

const log = useLogger('events')

// query parameters for getEvents are coming from HTTP (string) and from internal code, this normalize everything to boolean
export const boolish = z.preprocess((v) => {
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}, z.boolean())

export const eventQuerySchema = z.object({
  start: z.coerce.number().optional(),
  end: z.coerce.number().optional(),
  query: z.string().optional(),
  tags: z.preprocess((val) => {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') return val.split(',')
    return []
  }, z.array(z.string().transform(t => normalizeTag(t))).optional()),
  places: z.preprocess((val) => {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') return val.split(',')
    if (typeof val === 'number') return [val]
    return []
  }, z.array(z.coerce.number().int())).optional(),
  show_recurrent: boolish.optional(),
  show_multidate: boolish.prefault(true).optional(),
  show_federated: boolish.optional(),
  max: z.coerce.number().int().optional(),
  page: z.coerce.number().int().optional(),
  older: boolish.optional(),
  reverse: boolish.optional(),
  mine: boolish.optional(),
  ap_user_id: z.string().optional(),
  include_unconfirmed: boolish.default(false).optional(),
  include_parent: boolish.default(false).optional(),
  include_description: boolish.default(false).optional()
}).transform(o => ({
  ...o,
  // defaults have to be evaluated at parse time: at load time settings are not loaded yet
  // (and could change later) and "now" would be when the server started
  start: o.start ?? DateTime.local().toUnixInteger(),
  show_recurrent: o.show_recurrent ?? publicSettings.recurrent_event_visible,
  show_federated: o.show_federated ?? publicSettings.federated_events_in_home,
  ...(o.max && { limit: o.max })
}))

export type EventQueryType = z.infer<typeof eventQuerySchema>
export async function getEvents(opts?: EventQueryType, user?: User): Promise<Event[]> {
  const args = eventQuerySchema.parse(opts)

  const andConditions: WhereOptions<Event> = [
    { // AND
      ...(args.start && {
        [Op.or]: [
          { start_datetime: { [args.older ? Op.lte : Op.gte]: args.start } },
          { end_datetime: { [args.older ? Op.lte : Op.gte]: args.start } },
          {
            end_datetime: SQL_NULL,
            start_datetime: { [args.older ? Op.lte : Op.gte]: args.start - publicSettings.open_ended_event_default_duration * 3600 }
          }
        ]
      }),

      ...(args.end && { start_datetime: { [args.older ? Op.gte : Op.lte]: args.end } }),

      // include uncondirmed
      ...(!args.include_unconfirmed && { is_visible: true }),

      ...(args.mine && user && { userId: user.id }),

      // include recurrent events?
      ...(!args.show_recurrent && { parentId: null }),

      // include parent event
      ...(!args.include_parent && { recurrent: SQL_NULL })
    }
  ]

  // if (!args.show_multidate) {
  //   condition.multidate = { [Op.not]: true }
  // }

  const replacements: { [key: string]: unknown } = {}

  if (args.places) {
    andConditions.push({ placeId: args.places })
  }

  if (args.tags?.length) {
    andConditions.push(sql`${col('Event.id')} IN (
      SELECT ${col('eventId')}
      FROM ${sql.identifier('event_tags')}
      JOIN ${sql.identifier('tags')} ON ${col('tagTag')} = ${col('tags', 'tag')}
      WHERE ${col('tags', 'normalizedTag')} IN ${sql.list(args.tags)}
    )`)
  }

  if (args.query) {
    replacements.query = args.query
    andConditions.push({
      [Op.or]: [
        where(fn('LOWER', col('title')), Op.like, '%' + args.query + '%'),
        where(fn('LOWER', col('name')), Op.like, '%' + args.query + '%'),
        fn('EXISTS', literal(`SELECT 1 FROM event_tags WHERE event_tags.eventId=event.id AND LOWER(${col('tagTag').identifiers}) = LOWER(:query)`))
      ]
    })
  }

  let pagination = {}
  if (args.limit) {
    pagination = {
      limit: args.limit,
      offset: args.limit * (args?.page ?? 0)
    }
  }

  return Event.findAll({
    where: andConditions,
    attributes: {
      exclude: [
        'likes', 'boost', 'userId', 'createdAt',
        'placeId', 'ap_object', 'ap_id',
        ...(!args?.include_description ? ['description'] : [])
      ]
    },
    order: [['start_datetime', args.reverse ? 'DESC' : 'ASC']],
    include: [
      {
        model: Tag,
        // order: [sql`(SELECT COUNT(tagTag) FROM event_tags WHERE tagTag = tag) DESC)`],
        attributes: ['tag'],
        through: { attributes: [] }
      },
      { model: Place, required: false, attributes: ['id', 'name', 'address', 'latitude', 'longitude'] },
      { association: 'APUser', attributes: ['ap_id', 'object'] }
    ],
    ...pagination,
    replacements
  })
}

const MAX_TIMESTAMP = 1000 * 24 * 60 * 60 * 365
const eventAPISchema = z.object({
  id: z.int().optional(),
  title: z.string({ message: 'title required' }).min(1).trim(),
  is_visible: z.stringbool().default(true),
  start_datetime: z.coerce.number({ error: 'start_datetime required' })
    .int()
    .positive()
    .max(MAX_TIMESTAMP, { message: 'start_datetime is too far in the future' }),
  end_datetime: z.coerce.number({ error: 'end_datetime must be a valid timestamp' })
    .int()
    .max(MAX_TIMESTAMP, { message: 'end_datetime is too far in the future' })
    .nullable()
    .default(null),
  tags: z.array(z.string(), { error: 'tags field must be an array' }).optional(),
  status: z.enum(EventStatusEnum).default('EventScheduled'),
  description: z.preprocess((val) => {
    const str = typeof val === 'string' ? val : val ? String(val) : ''
    try {
      // apply linkify then sanitize the resulting HTML
      return sanitizeHTML(linkifyHtml(str, { target: '_blank', render: { email: (ctx: IntermediateRepresentation) => ctx.content } }))
    } catch {
      return str
    }
  }, z.string()),
  online_locations: z.array(z.string()).nullable().default(null),
  cost: z.string().max(60).optional().transform(v => v === undefined ? undefined : (v.trim() || null)),
  // image
  image_name: z.string().optional(),
  image: multipartFileSchema.optional(),
  image_url: z.string().optional(),
  image_focalpoint: focalPointSchema.default([0, 0]),
  // location fields
  place_id: z.coerce.number().int().optional(),
  place_name: z.string().optional(),
  place_postal_address: jsonCodec(PostalAddressSchema).optional(),
  place_address: z.string().optional(),
  place_latitude: z.coerce.number().optional(),
  place_longitude: z.coerce.number().optional(),
  recurrent: jsonCodec(RecurrentSchema).optional()
})
  .refine(data => data.place_id != null || data.online_locations?.length || Boolean(data.place_name && (data.place_address || data.place_postal_address)),
    { message: 'place_id or place_name and place_address are required' })
  .refine(data => data.end_datetime === null || data.start_datetime <= data.end_datetime,
    { message: 'start_datetime is greater than end_datetime' })
  .refine(data => !data.recurrent?.until || data.start_datetime <= data.recurrent.until,
    { message: 'start_datetime is greater than the end of the recurrence' })

export function validateEvent(publicSettings: Settings, user?: InferAttributes<User>) {
  const isAnonymous = !user
  return eventAPISchema
    .refine(data => !(data.end_datetime === null && !publicSettings.allow_event_without_end_time),
      { error: 'end_datetime is required' })
    .refine(() => !(isAnonymous && !publicSettings.allow_anon_event),
      { error: 'Anonymous event update/creation not allowed' })
    .refine(data => !(data.recurrent?.frequency && !publicSettings.allow_recurrent_event),
      { error: 'Recurrent event update/creation not allowed' })
    .refine(data => !(isAnonymous && data.start_datetime < DateTime.local().toUnixInteger()),
      { error: 'Anonymous user cannot create past events' })
    .transform((data) => {
      const is_visible = isAnonymous ? false : data.is_visible
      return { ...data, is_visible, userId: user?.id }
    })
}

export type EventAPIType = z.infer<typeof eventAPISchema>

export async function upsertEvent(payload: unknown, user?: InferAttributes<User>) {
  let event: Event | null = null
  let eventPayload

  try {
    eventPayload = validateEvent(publicSettings, user).parse(payload)
  } catch (e) {
    log.warn(e)
    const message = e instanceof z.ZodError ? e.issues[0]?.message : String(e)
    throw createError({ statusCode: 400, message })
  }

  const isNewEvent = eventPayload.id == null
  let wasRecurrent = false
  if (eventPayload.id != null) {
    event = await Event.findByPk(eventPayload.id)
    if (!event) {
      log.warn('Event not found: %s', eventPayload.id)
      throw createError({ statusCode: 404, message: 'Event not found' })
    }
    // check if the user is the owner of the event
    if (!canModifyEvent(event, user)) {
      log.warn('User not authorized to modify event: %s', eventPayload.id)
      throw createError({ statusCode: 403, message: 'You are not authorized to modify this event' })
    }
    wasRecurrent = !!event.recurrent
  }

  // find or create the place
  let place: Place | undefined
  const address = eventPayload.place_postal_address || eventPayload.place_address
  if (eventPayload.place_id != null || (eventPayload.place_name && address)) {
    place = await findOrCreatePlace({
      ...(eventPayload.place_id && { id: eventPayload.place_id }),
      name: eventPayload.place_name,
      postal_address: eventPayload.place_postal_address,
      address: addressToString(address || ''),
      latitude: eventPayload.place_latitude,
      longitude: eventPayload.place_longitude
    })
  }

  // do we have an image?
  const tmpMedia = await setEventMedia(eventPayload)
  // media could be undefined (do not modify), null (remove) or an array of media
  const media = tmpMedia && [tmpMedia]
  if (event) {
    event = await event.update({
      ...eventPayload,
      ...(place?.id != null && { placeId: place.id }),
      media
    }).catch((e) => {
      throw createError({ statusCode: 500, message: e.message })
    })
  } else {
    event = await Event.create({
      ...eventPayload,
      ...(place?.id != null && { placeId: place.id }),
      media
    }).catch((e) => {
      throw createError({ statusCode: 500, message: e.message })
    })
  }

  // create/assign tags
  let tags: Tag[] = []
  if (eventPayload.tags) {
    tags = await findOrCreateTags(eventPayload.tags)
    await event.setTags(tags)
  }

  // upcoming occurrences of a modified recurrent event are created again with
  // its new details (but the skipped ones, which stay skipped)
  if (wasRecurrent) {
    await removeUpcomingOccurrences(event, true)
  }

  // create recurrent instances of event if needed
  // without waiting for the task manager
  if (event?.recurrent && event.is_visible) {
    await createRecurrent()
  } else {
    // sign Event if federation is enabled
    if (publicSettings.enable_federation) {
      try {
        event.ld_signature = await sign(eventToAP(event), secretSettings.privateKey, `${publicSettings.baseurl}/federation/u/${publicSettings.instance_name}#main-key`)
        await event.save({ silent: true })
      } catch (e) {
        log.warn('Error signing Event ', e)
      }
    }
    // send notifications
    notifyEvent(isNewEvent ? 'Create' : 'Update', event.id)
  }

  return { event, place, tags }
}

export async function getEventBySlugOrId(slug_or_id?: string) {
  const id = Number(slug_or_id)
  const where: WhereOptions<Event> = isNaN(id) || !Number.isInteger(id)
    ? { slug: slug_or_id }
    : { [Op.or]: [{ slug: slug_or_id }, { id }] }

  const event = await Event.findOne({
    where,
    attributes: {
      exclude: ['createdAt', 'placeId', 'apUserApId']
    },
    include: [
      { model: Tag, required: false, attributes: ['tag'], through: { attributes: [] } },
      { model: Place, attributes: ['name', 'address', 'latitude', 'longitude', 'id', 'ap_id'] },
      { model: User, required: false, attributes: ['is_active'] },
      { model: Event, required: false, as: 'parent', attributes: ['id', 'recurrent', 'is_visible', 'start_datetime'] }
    ]
  })

  return event
  // TODO
  // admin, editors and event's owner gets the number of moderation messages (could open moderation)
  // let n_messages = 0
  // if (isAdminOrEditor || event.userId !== user?.id) {
  //   n_messages = await Message.count({ where: { eventId: event.id, ...(!isAdminOrEditor && { is_author_visible: true }) } }).catch(() => 0)
  // }
}

/**
 * This method return the media to set to an event, based on the request payload:
 * in case a remote url is specified, this will be downloaded and the related Media is returned
 * in case an image is uploaded, the image is saved and the related Media is returned
 * in case a local url is specified this is probably a PUT so undefined is returned to avoid an update of that field
 * in case there is no url a null is returned to remove any media from the event
 */
export async function setEventMedia(eventPayload: EventAPIType): Promise<Media | undefined | null> {
  if (eventPayload.image || eventPayload.image_url) {
    const focalpoint = eventPayload.image_focalpoint
    if (!eventPayload.image && eventPayload.image_url) {
      if (!/^https?:\/\//.test(eventPayload.image_url)) return undefined
      return getImageFromURL(
        eventPayload.image_url,
        eventPayload.image_name || eventPayload.title,
        focalpoint
      )
    } else if (eventPayload.image) {
      return saveUploadedEventImage(
        eventPayload.image,
        eventPayload.image_name || eventPayload.title || '',
        focalpoint
      )
    }
  }
  return null
}

/**
 * get the last modified date of items.
 * this is used to set `Last-Modified` header and to check for non modified 304 result
 */
export function getLastModified(items: readonly { updatedAt: Date }[]) {
  if (!items?.length) {
    return new Date(0)
  }
  const lastModified = items.reduce((last: Date, item) => item.updatedAt > last ? item.updatedAt : last, new Date(0))
  return lastModified
}

export function getMaxLastModifieds(lastModifieds: Array<Date | undefined>) {
  return lastModifieds.reduce((max, current) => {
    if (!max) return current
    if (!current) return max
    return (current > max) ? current : max
  }, undefined)
}

/**
 * Map an Event model instance to the EventAPI type
 * @param event the Event model instance to map
 * @param options.place the Place associated with the event, if not already included in the event (optional)
 * @param options.tags the Tags associated with the event, if not already included in the event (optional)
 * @param options.user the User for which we want to know if the event is_mine or not (optional)
 */
export function mapEvent(event: Event,
  options?: {
    place?: Place
    tags?: Tag[]
    user?: InferAttributes<User>
  }): EventAPI {
  let response: EventAPI = {
    id: event.id,
    slug: event.slug,
    status: event.status,

    title: event.title,

    media: event?.media ?? [],

    start_datetime: event.start_datetime,
    end_datetime: event.end_datetime,
    displayEndTime: event.ap_object?.displayEndTime,

    place: placeToJSON(event?.place ?? options?.place),

    is_mine: event.userId ? event.userId === options?.user?.id : false,
    is_anon: typeof event.userId === 'undefined' || event.userId === null,
    is_visible: event.is_visible,
    original_url: event?.ap_object?.url ?? event?.ap_id ?? undefined,

    online_locations: event.online_locations,
    cost: event.cost ?? undefined,
    tags: (event.tags ?? options?.tags)?.map(t => t.tag),
    boost: event.boost,
    likes: event.likes,
    parent: event?.parent,
    parentId: event.parentId,
    ...(event.recurrent && { recurrent: event.recurrent })
    // TODO
    // n_msgs: event?.,
  }

  if (event.description) {
    response.description = event.description
    response.plain_description = htmlToText(event.description)
  }

  // remove undefined or empty fields from response
  response = Object.fromEntries(
    Object.entries(response)
      .filter(([_, val]) => (val !== undefined && val !== null && !(Array.isArray(val) && val.length === 0)))) as EventAPI

  // add the original AP user if present and not excluded
  if (event?.APUser?.object) {
    response.ap_user = {
      image: event.APUser.object.icon?.url ?? `${event.APUser.object.url}/favicon.ico`,
      name: event.APUser.object.name
    }
  }

  return response
}

export function mapEvents(events: Event[]): EventAPI[] {
  return events.map(e => mapEvent(e))
}

/**
 * Calculate an ETag from a list of generic items using `id`, `updatedAt` and `status` (if present) fields to build the hash
*/
export function calculateEtag(items: readonly { id: number | string, updatedAt: Date, status?: EventStatus }[]): string {
  const base = items
    .map(e => `${e.id}:${e?.status ?? ''}:${e.updatedAt?.toISOString()}`)
    .join('|')

  return createHash('sha1').update(base).digest('hex')
}

export async function sendEvents(event: H3Event, events: Event[]) {
  const etag = calculateEtag(events)
  if (await handleCache(event, etag)) return
  return events.map(e => mapEvent(e))
}

export async function getMessages(eventId: number) {
  const event = await Event.findByPk(eventId, { include: [{ model: Message, as: 'messages' }] })
  if (!event) {
    throw createError({ status: 400 })
  }
  return event
}

export function eventToAP(event: Event) {
  // if it's a remote event return the original
  if (event.ap_object) return event.ap_object

  const username = publicSettings.instance_name
  const opt = {
    zone: publicSettings.instance_timezone,
    locale: publicSettings.instance_locale
  }

  const datetime = DateTime.fromSeconds(event.start_datetime, opt).toLocaleString({ weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

  // https://framagit.org/les/gancio/-/issues/304
  // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-summary
  const summary = `<p>${event.place?.name ?? ''} ${datetime}</p>${event?.description ?? ''}`

  let attachment: APAttachment[] = []
  let location: APLocation[] = []

  if (event.online_locations?.length) {
    location = event.online_locations.map(url => ({
      type: 'VirtualLocation',
      url
    }))
    attachment = event.online_locations.map(href => ({
      type: 'Link',
      mediaType: 'text/html',
      name: href,
      href
    }))
  }

  if (event.place && event.place?.name !== 'online') {
    location.push(PlaceToAP(event.place))
  }

  if (event?.media?.length) {
    attachment.push({
      type: 'Document',
      mediaType: 'image/jpeg',
      url: `${publicSettings.baseurl}/media/${event.media[0]?.url}`,
      name: event.media[0]?.name || event.title || '',
      focalPoint: event.media[0]?.focalpoint || [0, 0]
    })
  }

  let tags = event.tags?.map(tag => tag.tag) ?? []

  // add default fedi hashtags if needed
  if (publicSettings.default_fedi_hashtags.length) {
    tags = [...new Set([...tags, ...publicSettings.default_fedi_hashtags])]
  }

  const tag: APTag[] = tags?.map(tag => ({
    type: 'Hashtag',
    name: tag,
    href: `${publicSettings.baseurl}/tag/${encodeURIComponent(tag)}`
  })) ?? []

  const endTime = DateTime.fromSeconds(event.end_datetime || (event.start_datetime + publicSettings.open_ended_event_default_duration * 3600), opt)
    .toISO({ suppressMilliseconds: true })

  const e: APEvent = {
    '@context': [
      'https://schema.org',
      'https://www.w3.org/ns/activitystreams',
      // 'https://w3id.org/fep/8a8e',
      'https://w3id.org/security/v1',
      {
        quote: 'https://w3id.org/fep/044f#quote',
        canQuote: 'gts:canQuote',
        automaticApproval: 'gts:automaticApproval',
        interactionPolicy: 'gts:interactionPolicy'
      }
    ],
    'id': `${publicSettings.baseurl}/federation/m/${event.id}`,
    'name': event.title,
    'url': `${publicSettings.baseurl}/event/${event.slug || event.id}`,
    'type': 'Event' as const,
    'eventStatus': event.status,
    'startTime': DateTime.fromSeconds(event.start_datetime, opt).toISO({ suppressMilliseconds: true }) ?? '',
    'endTime': endTime,
    'displayEndTime': event.end_datetime ? true : false,
    ...(event.ld_signature ? { signature: event.ld_signature } : {}),
    location,
    attachment,
    tag,
    'timezone': publicSettings.instance_timezone,
    'published': event.updatedAt.toISOString(),
    'updated': event.updatedAt.toISOString(),
    'attributedTo': `${publicSettings.baseurl}/federation/u/${username}`,
    'to': ['https://www.w3.org/ns/activitystreams#Public'],
    'content': event.description || '',
    // https://fediverse.codeberg.page/fep/fep/044f/
    ...(publicSettings.enable_federation_quoting &&
      { interactionPolicy: { canQuote: { automaticApproval: 'https://www.w3.org/ns/activitystreams#Public' } } }),
    summary
  }

  return e
}

export function canModifyEvent(event: Event, user?: UserSession) {
  return user && (['admin', 'editor'].includes(user.role) || event?.userId === user?.id)
}
