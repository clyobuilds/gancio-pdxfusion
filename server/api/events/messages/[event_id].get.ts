import { defineEventHandler, createError } from 'h3'
import { Event, Message } from '~~/server/services'

/**
 * @openapi
 * /api/events/messages/{event_id}:
 *   get:
 *     summary: Get messages event
 *     description: Get messages of an event by id.
 *     parameters:
 *       - name: event_id
 *         in: path
 *         description: Id of the event.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event's messages.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       404:
 *         description: Event does not exist.
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const eventId = evt.context.params?.event_id
  const event = await Event.findByPk(eventId, { include: [Message] })
  if (!event) {
    throw createError({ status: 404 })
  }
  return event.messages
})
