import z from 'zod'
import { defineEventHandler, getRouterParam, readValidatedBody, createError } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { Announcement } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

const schema = z.object({
  title: z.string().min(1).max(100),
  announcement: z.string().min(1),
  visible: z.boolean().optional()
})

/**
 * @openapi
 * /api/announcements/{id}:
 *   put:
 *     summary: Update announcement
 *     description: Update an announcement by id.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the announcement to update.
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
 *               title:
 *                 type: string
 *                 description: Announcement title.
 *                 example: Announcement title
 *               announcement:
 *                 type: string
 *                 description: Announcement text.
 *                 example: Announcement text
 *               visible:
 *                 type: boolean
 *                 description: Indicates if an announcement is visible or not.
 *                 example: true
 *     responses:
 *       200:
 *         description: The updated announcement with identifier `id`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       404:
 *         description: Announcement not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Announcements
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('announcement put')
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, schema.parse)

  const announcement = await Announcement.findByPk(id)
  if (!announcement) {
    log.warn(`Not found: ${id}`)
    throw createError({ statusCode: 404, message: 'Announcement not found' })
  }
  return announcement.update(body)
})
