import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Announcement } from '~~/server/services'

/**
 * @openapi
 * /api/announcements/{id}:
 *   delete:
 *     summary: Delete announcement
 *     description: Delete an announcement by id.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the announcement to delete.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The announcement has been deleted.
 *       404:
 *         description: Announcement not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Announcements
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('announcement delete')
  const id = getRouterParam(event, 'id')

  const announcement = await Announcement.findByPk(id)
  if (!announcement) {
    log.error('This announcement does not exist: ', id)
    throw createError({ status: 404, message: 'This announcement does not exists' })
  }

  return announcement.destroy()
})
