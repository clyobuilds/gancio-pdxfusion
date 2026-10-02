import { defineEventHandler } from 'h3'
import { enableCors, handleCache } from '~~/server/lib/API'
import { Announcement } from '~~/server/services'

/**
 * @openapi
 * /api/announcements:
 *   get:
 *     summary: Get visible announcements
 *     description: Get all visible announcements to show preview in homepage.
 *     responses:
 *       200:
 *         description: All visible announcements.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                     description: Announcement title.
 *                     example: Announcement title
 *                   id:
 *                     type: integer
 *                     description: Announcement identifier.
 *                     example: 1
 *     tags:
 *       - Announcements
 */
export default defineEventHandler(async (evt) => {
  enableCors(evt)
  if (await handleCache(evt, Announcement)) return
  return Announcement.findAll({ where: { visible: true }, attributes: ['title', 'id'] })
})
