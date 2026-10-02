import { readBody, defineEventHandler } from 'h3'
import { setSetting } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/settings:
 *   put:
 *     summary: Set setting value
 *     description: Set setting value. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: Setting key.
 *                 example: title
 *               value:
 *                 type: string
 *                 description: Setting value.
 *                 example: Demo Gancio
 *     responses:
 *       200:
 *         description: Value set.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: Demo Gancio
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Settings
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const setting = await readBody(event) // , body => settingSchema.parse(body))
  const result = await setSetting(setting.key, setting.value)
  return result[0].value
})