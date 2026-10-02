import { defineEventHandler } from 'h3'
import { Place } from '~~/server/services'

/**
 * @openapi
 * /api/sitemap/places:
 *   get:
 *     summary: Get places paths
 *     description: Get places path URL.
 *     responses:
 *       200:
 *         description: Places URLs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   loc:
 *                     type: string
 *                     description: Place URL path.
 *                     example: /place/3809/test-place
 *     tags:
 *       - Sitemap
 */
export default defineEventHandler(async () => {
  const places = await Place.findAll({
    attributes: ['name', 'id'],
    raw: true
  })

  const urls = places.map(e => ({
    loc: `/place/${e.id}/${e.name}`
  }))

  return urls
})