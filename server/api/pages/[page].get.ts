import { defineEventHandler, getRouterParam } from 'h3'
import { isRole } from '~~/server/lib/auth'
import { Page } from '~~/server/services'

/**
 * @openapi
 * /api/pages/{page}:
 *   get:
 *     summary: Get page
 *     description: Get page by slug. If admin role, all pages are shown, otherwise only visible pages.
 *     parameters:
 *       - name: page
 *         in: path
 *         required: true
 *         example: more-info
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "The page with slug `page`."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Page'
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Pages
 */
export default defineEventHandler(async (event) => {
  const page = getRouterParam(event, 'page')
  if (await isRole(event, 'admin')) {
    return Page.findOne({ where: { slug: page } })
  }
  return Page.findOne({ where: { slug: page, visible: true } })
})
