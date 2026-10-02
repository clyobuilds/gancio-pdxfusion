import { defineEventHandler } from 'h3'
import { Announcement } from '~~/server/services'
import { requireRole } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/announcements/list:
 *   get:
 *     summary: Get all announcements
 *     description: Get full announcements to show in admin panel.
 *     responses:
 *       200:
 *         description: All announcements.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Announcement'
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Announcements
 */
export default defineEventHandler(async (evt) => {
  await requireRole(evt, ['admin', 'editor'])
  return Announcement.findAll()
})
