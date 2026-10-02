import { defineEventHandler, getRouterParam, createError, readValidatedBody } from 'h3'
import { getUser } from '~~/server/lib/getUser'
import { z } from 'zod'
import { useLogger } from '~~/server/lib/logger'
import { Event, Place } from '~~/server/services/db'
import { notifyEvent } from '~~/server/services/notifier'
import { canModifyEvent, mapEvent } from '~~/server/services/events'
import { EventStatusEnum } from '~~/server/federation/types'

const schema = z.object({
  status: z.enum(EventStatusEnum).optional()
}).refine(data => data.status !== undefined, {
  error: 'At least one field must be provided'
})

/**
 * @openapi
 * /api/events/{id}:
 *   patch:
 *     summary: Update event status
 *     description: Update event status by id.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the event to update status.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/EventStatus'
 *     responses:
 *       200:
 *         description: Updated event.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventAPI'
 *       401:
 *         description: Anonymous user cannot patch events or cannot modufy the event.
 *       404:
 *         description: Event does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const log = useLogger('Patch event')
  const id = getRouterParam(evt, 'id')
  const user = await getUser(evt)
  if (!user) {
    log.warn('Anonymous user cannot patch events')
    throw createError({ statusCode: 401, statusMessage: 'Anonymous user cannot patch events' })
  }

  if (!id || !Number(id)) {
    log.warn('Event not found: %s', id)
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  const event = await Event.findByPk(id, { include: [{ model: Place, required: false }] })
  if (!event) {
    log.warn('Event not found: %d', id)
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  if (!canModifyEvent(event, user)) {
    log.warn('Cannot modify the event %s', event.title)
    throw createError({ statusCode: 401, statusMessage: 'Cannot modify this event' })
  }

  const { success, error, data } = await readValidatedBody(evt, schema.safeParse)
  if (!success) {
    throw createError({ statusCode: 404, statusMessage: error.message })
  }

  log.info('update event status ', data.status)
  await event.update({ status: data.status })

  if (!event.recurrent && event.is_visible) {
    // send notifications
    notifyEvent('Update', event.id)
  }

  return mapEvent(event)
})
