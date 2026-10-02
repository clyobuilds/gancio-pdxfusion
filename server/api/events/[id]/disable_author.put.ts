import { defineEventHandler, createError, getRouterParam } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { requireRole } from '~~/server/lib/auth'
import { Event, publicSettings, User } from '~~/server/services'

/**
 * disable the author of specified event
 */

/**
 * @openapi
 * /api/events/{id}/disable_author:
 *   put:
 *     summary: Disable author
 *     description: Disable the author of specified event.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The author that has been disabled.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Cannot disable author, moderation is not enabled.
 *       404:
 *         description: Event not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const log = useLogger('event:disable_author')
  const id = getRouterParam(evt, 'id')
  if (!publicSettings.enable_moderation) {
    log.warn('Cannot disable author, moderation is not enabled (eventId: %d)', id)
    throw createError({ statusCode: 403 })
  }

  await requireRole(evt, ['editor', 'admin'])
  const event = await Event.findByPk(id, { include: [{ model: User, required: true }] })
  if (!event) {
    log.warn(`Not found ${id}`)
    throw createError({ statusCode: 404 })
  }

  return event.user.update({ is_active: false })
})