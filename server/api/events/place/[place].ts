import { createError, defineEventHandler, getRouterParam, getValidatedQuery } from 'h3'
import z from 'zod'
import { handleCache } from '~~/server/lib/API'
import { useLogger } from '~~/server/lib/logger'
import { Place, calculateEtag, getEvents, mapEvents } from '~~/server/services'

const schema = z.object({
  show_recurrent: z.stringbool().optional()
})

/**
 * @openapi
 * /api/events/place/{place}:
 *   get:
 *     summary: Get events by place
 *     description: Get events and past events related to the specified place.
 *     parameters:
 *       - name: place
 *         in: path
 *         description: Place identifier.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *       - name: show_recurrent
 *         in: query
 *         description: Show recurrent events or not.
 *         example: true
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of events related to the place.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventAPI'
 *                   description: Unconfirmed future events.
 *                 pastEvents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventAPI'
 *                   description: Unconfirmed old events.
 *                 place:
 *                   $ref: '#/components/schemas/Place'
 *       400:
 *         description: Invalid place parameter.
 *       404:
 *         description: Place not found.
 *     tags:
 *       - Events
 */
const log = useLogger('events/place')
export default defineEventHandler(async (evt) => {
  const query = await getValidatedQuery(evt, schema.parse)

  const nameOrId = getRouterParam(evt, 'place')
  if (!nameOrId) {
    throw createError({ statusCode: 400, message: `Invalid place parameter` })
  }
  const id = Number(nameOrId)
  const place = !isNaN(id) && Number.isInteger(id)
    ? await Place.findByPk(id)
    : await Place.findOne({ where: { name: nameOrId } })
  if (!place) {
    throw createError({ statusCode: 404, message: `Place not found` })
  }

  log.debug(`Events for place: ${place.name}`)
  // place.address = addressToString(place.address)
  const eventsFilters = {
    places: [place.id],
    show_federated: true,
    show_recurrent: query.show_recurrent
  }
  const events = await getEvents(eventsFilters)
  const pastEvents = await getEvents({ ...eventsFilters, older: true, reverse: true })

  const etag = calculateEtag([...events, ...pastEvents, place])
  if (await handleCache(evt, etag)) return
  return {
    events: mapEvents(events),
    pastEvents: mapEvents(pastEvents),
    place
  }
})
