import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireUser } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Event } from '~~/server/services'
import { canModifyEvent } from '~~/server/services/events'
import { createRecurrent } from '~~/server/services/recurrent'

/**
 * @openapi
 * /api/events/{id}/toggle:
 *   put:
 *     summary: Toggle confirmation
 *     description: Toggle event confirmation status by id. Note that this could be called by an editor, an admin or the event owner.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the event to toggle status.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated event.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       401:
 *         description: Cannot modify the event.
 *       404:
 *         description: Event does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const log = useLogger('Event toggle confirmation')
  const id = getRouterParam(evt, 'id')

  const user = await requireUser(evt)
  const event = await Event.findByPk(id)
  if (!event) {
    log.warn(`Not found ${id}`)
    throw createError({ statusCode: 404 })
  }

  if (!canModifyEvent(event, user)) {
    log.warn(`Someone not allowed is trying to ${event.is_visible ? 'unconfirm' : 'confirm'} -> "${event.title}`)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  await event.update({ is_visible: !event.is_visible })

  // create the next occurrence of a just confirmed recurrent event
  // without waiting for the task manager
  if (event.recurrent && event.is_visible) {
    await createRecurrent()
  }

  return event
})
