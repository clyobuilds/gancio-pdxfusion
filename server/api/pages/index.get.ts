import { defineEventHandler } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { Page } from '~~/server/services'

/**
 * @openapi
 * /api/pages:
 *   get:
 *     summary: Get all pages
 *     description: Get all pages. Admin role is required.
 *     responses:
 *       200:
 *         description: All pages.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Page'
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Pages
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  return Page.findAll()
})