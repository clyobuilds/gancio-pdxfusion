import { defineEventHandler, getQuery } from 'h3'
import { getEvents, mapEvents } from '~~/server/services/events'
import { Event, publicSettings } from '~~/server/services'
import { useLogger } from '~~/server/lib/logger'
import { getCollectionEvents } from '~~/server/services/collections'
import { enableCors, handleCache } from '~~/server/lib/API'

/**
 * @openapi
 * /api/events:
 *   get:
 *     summary: Get events
 *     description: "Get events. By default, returns upcoming events from now on or of specific collection if collection in home is set.
 *
 *       You can see examples at:
 *
 *       - [https://demo.gancio.org/api/events](https://demo.gancio.org/api/events)
 *
 *       - [Usage example](https://framagit.org/les/gancio/-/blob/master/webcomponents/src/GancioEvents.svelte#L18-42)"
 *     parameters:
 *       - name: start
 *         in: query
 *         description: "Start timestamp (default: now)."
 *         schema:
 *           type: integer
 *         example: 1784109600
 *       - name: end
 *         in: query
 *         description: End timestamp (optional).
 *         schema:
 *           type: integer
 *         example: 1784109600
 *       - name: query
 *         in: query
 *         description: Search for this string in title, place or tags.
 *         schema:
 *           type: string
 *         example: test
 *       - name: tags
 *         in: query
 *         description: List of tags.
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example:
 *           - testtag
 *           - testtag2
 *       - name: place
 *         in: query
 *         description: List of places identifiers.
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example:
 *           - 20
 *           - 34
 *       - name: show_multidate
 *         in: query
 *         description: "Show also multidate events (default: true)."
 *         schema:
 *           type: boolean
 *         example: false
 *       - name: show_recurrent
 *         in: query
 *         description: "Show also recurrent events (default: as choosen in admin settings)."
 *         schema:
 *           type: boolean
 *         example: false
 *       - name: show_federated
 *         in: query
 *         description: Show federated events too.
 *         schema:
 *           type: boolean
 *         example: false
 *       - name: max
 *         in: query
 *         description: Limit events.
 *         schema:
 *           type: integer
 *         example: 100
 *       - name: page
 *         in: query
 *         description: Pagination.
 *         schema:
 *           type: integer
 *         example: 50
 *       - name: older
 *         in: query
 *         description: Select <= start instead of >=.
 *         schema:
 *           type: boolean
 *         example: true
 *       - name: reverse
 *         in: query
 *         description: Reverse order.
 *         schema:
 *           type: boolean
 *         example: true
 *     responses:
 *       200:
 *         description: List of events.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventAPI'
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('get events')
  enableCors(event)
  const opt = getQuery(event)
  let events
  if (await handleCache(event, Event)) return

  if (publicSettings.collection_in_home && !(opt.tags || opt.places || opt.query)) {
    log.debug('get collection events', publicSettings.collection_in_home)
    events = await getCollectionEvents({ name: publicSettings.collection_in_home, ...opt })
  } else {
    events = await getEvents(opt)
  }

  return mapEvents(events)
})
