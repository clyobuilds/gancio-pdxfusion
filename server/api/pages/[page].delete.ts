import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'

import { Page } from '~~/server/services'

/**
 * @openapi
 * /api/pages/{page}:
 *   delete:
 *     summary: Delete page
 *     description: Delete page by `id`. Admin role is required.
 *     parameters:
 *       - name: page
 *         in: path
 *         required: true
 *         example: 4
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The page with id `page` has been removed.
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
  const page = await Page.findByPk(page_id)

  if (!page) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  return page.destroy()
})
