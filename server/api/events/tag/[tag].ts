import { defineEventHandler, getRouterParam, createError, getValidatedQuery } from 'h3'
import z from 'zod'
import { handleCache } from '~~/server/lib/API'
import { useLogger } from '~~/server/lib/logger'
import { Tag, calculateEtag, getEvents, mapEvents } from '~~/server/services'
import { normalizeTag } from '~~/server/services/tags'

const schema = z.object({
  show_recurrent: z.stringbool().optional()
})

/**
 * @openapi
 * /api/events/tag/{tag}:
 *   get:
 *     summary: Get events by tag
 *     description: Get events by tag.
 *     parameters:
 *       - name: tag
 *         in: path
 *         required: true
 *         example: eventtag
 *         schema:
 *           type: string
 *       - name: show_recurrent
 *         in: query
 *         description: Show recurrent events or not.
 *         example: true
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of events.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventAPI'
 *                   description: Future events tagged by `tag`.
 *                 pastEvents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventAPI'
 *                   description: Old events tagged by `tag`.
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const log = useLogger('events/tag')
  const tagName = getRouterParam(evt, 'tag', { decode: true })
  const query = await getValidatedQuery(evt, schema.parse)

  if (!tagName) {
    log.warn('Tag not specified')
    throw createError({ statusCode: 404, statusMessage: 'Tag not specified' })
  }

  const normalizedTag = normalizeTag(tagName)
  const tags = await Tag.findAll({ where: { normalizedTag }, raw: true })
  if (!tags) {
    log.warn('Tag not found', tagName)
    throw createError({ statusCode: 404, message: 'Tag not found' })
  }

  const eventsFilters = {
    tags: [tagName],
    show_federated: true,
    show_recurrent: query.show_recurrent
  }

  const events = await getEvents(eventsFilters)
  const pastEvents = await getEvents({ ...eventsFilters, older: true, reverse: true })

  const etag = calculateEtag([...events, ...pastEvents])
  if (await handleCache(evt, etag)) return
  return {
    events: mapEvents(events),
    pastEvents: mapEvents(pastEvents)
  }
})
