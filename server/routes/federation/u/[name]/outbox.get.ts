import { defineEventHandler, getValidatedQuery, getRouterParam, setHeader, createError } from 'h3'
import { z } from 'zod'
import { useLogger } from '~~/server/lib/logger'
import { Event, Place, publicSettings, Tag } from '~~/server/services'
import { eventToAP } from '~~/server/services/events'

const schema = z.object({
  page: z.coerce.number().int().gte(1).optional()
})

// https://www.w3.org/TR/activitypub/#outbox
export default defineEventHandler(async (event) => {
  const EVENTS_PER_PAGE = 10
  const log = useLogger('federation outbox')
  // const { preferHTML } = require('../helpers')
  // if (preferHTML(req)){
  //   log.debug('[FEDI] Get actor but prefer text/html, redirect to homepage')
  //   return res.redirect(302, '/')
  // }

  const { page } = await getValidatedQuery(event, schema.parse)
  const name = getRouterParam(event, 'name')
  if (!name) {
    log.warn(`[FEDI] Bad /outbox request`)
    throw createError({ statusCode: 400, statusMessage: 'Bad request' })
  }

  if (name !== publicSettings.instance_name) {
    log.debug(`[FEDI] Get unknown actor ${name} (should be ${publicSettings.instance_name}`)
    throw createError({
      statusCode: 404,
      statusMessage: `No record found for ${name} (are you searching for ${publicSettings.instance_name} ?)`
    })
  }

  setHeader(event, 'Content-Type', 'application/activity+json; charset=utf-8')

  const n_events = await Event.count({ where: { is_visible: true, ap_id: null } })
  const last_page = Math.ceil(n_events / EVENTS_PER_PAGE)
  log.debug(`[FEDI] GET /outbox, should return all events from this instance: ${n_events}`)

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
      id: `${publicSettings.baseurl}/federation/u/${name}/outbox?page=${page}`,
      type: 'OrderedCollectionPage',
      totalItems: n_events,
      partOf: `${publicSettings.baseurl}/federation/u/${name}/outbox`,
      ...(page > 1 &&
        { prev: `${publicSettings.baseurl}/federation/u/${name}/outbox?page=${page - 1}` }
      ),
      ...(page < last_page &&
        { next: `${publicSettings.baseurl}/federation/u/${name}/outbox?page=${page + 1}` }
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
      'id': `${publicSettings.baseurl}/federation/u/${name}/outbox`,
      'type': 'OrderedCollection',
      'totalItems': n_events,
      ...(last_page > 0
        ? {
            first: `${publicSettings.baseurl}/federation/u/${name}/outbox?page=1`,
            last: `${publicSettings.baseurl}/federation/u/${name}/outbox?page=${last_page}`
          }
        : { first: null, last: null }
      )
    }
  }
})
