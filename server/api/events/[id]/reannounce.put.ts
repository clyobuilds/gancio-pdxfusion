import { defineEventHandler, getRouterParam, createError } from 'h3'
import { sendEvent } from '~~/server/federation/events'
import { useLogger } from '~~/server/lib/logger'
import { requireUser } from '~~/server/lib/auth'
import { Event, Place } from '~~/server/services'
import { canModifyEvent } from '~~/server/services/events'

/**
 * @openapi
 * /api/events/{id}/reannounce:
 *   put:
 *     summary: Reannounce event
 *     description: Reannounce event by id.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the event to reannounce.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event reannounced.
 *       403:
 *         description: Reannounce not allowed for current user.
 *       404:
 *         description: Event does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const log = useLogger('Event reannounce')
  const id = getRouterParam(evt, 'id')

  const user = await requireUser(evt)
  const event = await Event.findByPk(id, { include: [{ model: Place }] })

  if (!event) {
    log.warn(`Not found ${id}`)
    throw createError({ status: 404 })
  }

  if (!canModifyEvent(event, user)) {
    log.warn(`Someone not allowed is trying to reannounce -> "${event.title}`)
    throw createError({ status: 403 })
  }

  await sendEvent(event, 'Announce')
})
