import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { Page } from '~~/server/services'

/**
 * @openapi
 * /api/pages:
 *   post:
 *     summary: Create page
 *     description: Create page. Admin role is required.
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
 *                 example: More info
 *               content:
 *                 type: string
 *                 description: Page content.
 *                 example: More info about Gancio.
 *               visible:
 *                 type: boolean
 *                 description: Indicates if page is visible or not.
 *                 example: true
 *     responses:
 *       200:
 *         description: Created page.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Page'
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Pages
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const body = await readBody(evt)
  return Page.create(body)
})