import { defineEventHandler } from 'h3'
import { Event } from '~~/server/services'

/**
 * @openapi
 * /api/sitemap/events:
 *   get:
 *     summary: Get events paths
 *     description: Get events path URL.
 *     responses:
 *       200:
 *         description: Events URLs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   loc:
 *                     type: string
 *                     description: Event URL path.
 *                     example: /event/new-test
 *                   lastmod:
 *                     type: string
 *                     description: Event last modification.
 *                     example: 2026-07-09T15:41:34.811Z
 *     tags:
 *       - Sitemap
 */
export default defineEventHandler(async () => {
  const events = await Event.findAll({
    where: { is_visible: true },
    attributes: ['slug', 'updatedAt'],
    raw: true
  })
  const urls = events.map(e => ({

    loc: `/event/${e.slug}`,
    lastmod: e.updatedAt instanceof Date
      ? e.updatedAt.toISOString()
      : new Date(e.updatedAt).toISOString()
  }))

  return urls
})