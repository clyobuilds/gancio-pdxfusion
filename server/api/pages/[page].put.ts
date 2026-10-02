import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { Page } from '~~/server/services'

/**
 * @openapi
 * /api/pages/{page}:
 *   put:
 *     summary: Update page
 *     description: Update page by `id`. Admin role is required.
 *     parameters:
 *       - name: page
 *         in: path
 *         required: true
 *         example: 4
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
 *                 description: Page title.
 *                 example: More information
 *               content:
 *                 type: string
 *                 description: Page content.
 *                 example: More information about Gancio.
 *               visible:
 *                 type: boolean
 *                 description: Indicates if page is visible or not.
 *                 example: true
 *               slug:
 *                 type: string
 *                 description: Page slug.
 *                 example: more-information
 *     responses:
 *       200:
 *         description: Updated page.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Page'
 *       404:
 *         description: Page not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Pages
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const page_id = Number(getRouterParam(event, 'page'))
  const body = await readBody(event)
  const page = await Page.findByPk(page_id)

  if (!page) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  return page.update(body)
})