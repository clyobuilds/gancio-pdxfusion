import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Event } from '~~/server/services'

/**
 * @openapi
 * /api/events/{id}:
 *   delete:
 *     summary: Delete event
 *     description: Delete an event by id.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the event to be deleted.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event with identifier `id` deleted.
 *       404:
 *         description: Event does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const log = useLogger('event delete')
  const id = getRouterParam(evt, 'id')

  const event = await Event.findByPk(id)
  if (!event) {
    log.error('This event does not exist: ', id)
    throw createError({ status: 404, message: 'This event does not exists' })
  }

  // TODO: I cannot phisically remove the item as I need it to send the notification!
  // notifyEvent('Delete', event.id)
  return event.destroy()
})