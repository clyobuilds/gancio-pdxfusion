import { defineEventHandler, getQuery, getValidatedRouterParams, createError } from 'h3'

import { exportICS } from '~~/server/services/ics'
import { exportFeed } from '~~/server/services/rss'
import { Event, publicSettings } from '~~/server/services'
import { formatSchema } from '~~/server/types/validator'
import { useLogger } from '~~/server/lib/logger'
import { getEvents, mapEvents } from '~~/server/services/events'
import { getCollectionEvents } from '~~/server/services/collections'
import { handleCache } from '~~/server/lib/API'

/**
 * Return events in different formats: rss, ics, json
 *
 */
export default defineEventHandler(async (evt) => {
  const log = useLogger('feed events')
  const { format } = await getValidatedRouterParams(evt, formatSchema.parse)

  const opt = getQuery(evt)

  if (await handleCache(evt, Event)) return

  let events: Event[]
  if (publicSettings.collection_in_home && !(opt.tags || opt.places || opt.query)) {
    log.debug('get collection events', publicSettings.collection_in_home)
    events = await getCollectionEvents({ name: publicSettings.collection_in_home, ...opt })
  } else {
    events = await getEvents(opt)
  }

  switch (format) {
    case 'rss':
      return exportFeed(evt, events)
    case 'ics':
      return exportICS(evt, events)
    case 'json':
      return mapEvents(events)
    // case 'json-ld':
    //   return mapEventsJSONLD(events)
  }
  throw createError({ status: 400, message: 'Please specify a valid format: rss, feed, ics or json' })
})