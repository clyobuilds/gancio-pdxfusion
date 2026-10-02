import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'

import { Announcement } from '~~/server/services'

/**
 * @openapi
 * /api/announcements:
 *   post:
 *     summary: Create announcement
 *     description: Create an announcement. Admin role is required.
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
 *         description: The new announcement.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Announcements
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const body = await readBody(evt)
  return Announcement.create(body)
})
