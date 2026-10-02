import { defineEventHandler } from 'h3'
import { Tag } from '~~/server/services'

/**
 * @openapi
 * /api/sitemap/tags:
 *   get:
 *     summary: Get tags paths
 *     description: Get tags path URL.
 *     responses:
 *       200:
 *         description: Tags URLs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   loc:
 *                     type: string
 *                     description: Tag URL path.
 *                     example: /tag/test
 *     tags:
 *       - Sitemap
 */
export default defineEventHandler(async () => {
  const tags = await Tag.findAll({
    attributes: ['tag'],
    raw: true
  })

  const urls = tags.map(e => ({
    loc: `/tag/${e.tag}`
  }))

  return urls
})