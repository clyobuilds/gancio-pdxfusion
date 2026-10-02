import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { requireRole } from '~~/server/lib/auth'
import { Event } from '~~/server/services'

/**
 * @openapi
 * /api/events/{id}/assign_to_author:
 *   put:
 *     summary: Assign to author
 *     description: Assign an anonymous event to author. Note that this could be called by an editor or an admin.
 *     parameters:
 *       - name: id
 *         in: path
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
 *               userId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: The updated event.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const log = useLogger('event:assign_to_author')
  const id = getRouterParam(evt, 'id')

  await requireRole(evt, ['editor', 'admin'])
  const event = await Event.findByPk(id)
  if (!event) {
    log.warn(`Not found ${id}`)
    throw createError({ statusCode: 404 })
  }

  const { userId } = await readBody(evt)
  return event.update({ userId })
})