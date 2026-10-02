import { defineEventHandler, getValidatedQuery, getRouterParam, setHeader, createError } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { Event, Place, publicSettings, Tag } from '~~/server/services'
import { eventToAP } from '~~/server/services/events'
import { z } from 'zod'

const schema = z.object({
  page: z.coerce.number().int().gte(1).optional()
})

export default defineEventHandler(async (event) => {
  const EVENTS_PER_PAGE = 10
  const log = useLogger('federation events endpoint')

  const { page } = await getValidatedQuery(event, schema.parse)
  const name = getRouterParam(event, 'name')
  if (!name) {
    log.warn(`Bad /events request`)
    throw createError({ statusCode: 400, message: 'Bad request' })
  }

  if (name !== publicSettings.instance_name) {
    log.debug(`Get unknown actor ${name} (should be ${publicSettings.instance_name}`)
    throw createError({
      statusCode: 404,
      message: `No record found for ${name} (are you searching for ${publicSettings.instance_name} ?)`
    })
  }

  setHeader(event, 'Content-Type', 'application/activity+json; charset=utf-8')

  const n_events = await Event.count({ where: { is_visible: true, ap_id: null } })
  const last_page = Math.ceil(n_events / EVENTS_PER_PAGE)
  log.debug(`[FEDI] GET /events, should return all events from this instance: ${n_events}`)

  if (page && page <= last_page) {
    const events = await Event.findAll({
      where: { is_visible: true, ap_id: null },
      include: [{ model: Tag, required: false }, Place],
      limit: EVENTS_PER_PAGE,
      offset: (page - 1) * EVENTS_PER_PAGE,
      order: [['start_datetime', 'DESC']]
    })
    return {
      // '@context': Helpers['@context'],
      id: `${publicSettings.baseurl}/federation/u/${name}/events?page=${page}`,
      type: 'OrderedCollectionPage',
      totalItems: n_events,
      partOf: `${publicSettings.baseurl}/federation/u/${name}/events`,
      ...(page > 1 &&
        { prev: `${publicSettings.baseurl}/federation/u/${name}/events?page=${page - 1}` }
      ),
      ...(page < last_page &&
        { next: `${publicSettings.baseurl}/federation/u/${name}/events?page=${page + 1}` }
      ),
      orderedItems: events.map(e => ({
        id: `${publicSettings.baseurl}/federation/m/${e.id}#create`,
        type: 'Create',
        to: 'https://www.w3.org/ns/activitystreams#Public',
        published: e.createdAt.toISOString(),
        actor: `${publicSettings.baseurl}/federation/u/${name}`,
        object: eventToAP(e)
      }))
    }
  } else {
    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      'id': `${publicSettings.baseurl}/federation/u/${name}/events`,
      'type': 'OrderedCollection',
      'totalItems': n_events,
      ...(last_page > 0
        ? {
            first: `${publicSettings.baseurl}/federation/u/${name}/events?page=1`,
            last: `${publicSettings.baseurl}/federation/u/${name}/events?page=${last_page}`
          }
        : { first: null, last: null }
      )
    }
  }
})
