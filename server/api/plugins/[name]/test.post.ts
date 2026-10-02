import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { pluginController } from '~~/server/services'

/**
 * @openapi
 * /api/plugins/{name}/test:
 *   post:
 *     summary: Test plugin
 *     description: Test plugin. Admin role is required.
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         description: Plugin name
 *         example: Example
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Plugin settings.
 *             properties:
 *               enable:
 *                 type: boolean
 *                 example: false
 *             x-additionalPropertiesName: setting_key
 *             additionalProperties:
 *               type:
 *                 - string
 *                 - boolean
 *                 - number
 *               example: setting_value
 *     responses:
 *       200:
 *         description: Plugin test result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   description: Indicates if action has been done.
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Plugin name is required or can not test plugin.
 *       404:
 *         description: Plugin not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Plugins
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const name = getRouterParam(evt, 'name')
  if (!name) {
    throw createError({ statusCode: 400, message: 'Missing plugin name' })
  }
  const { settings } = await readBody(evt)
  try {
    return await pluginController.testPlugin(name, settings)
  } catch (e) {
    return createError({ statusCode: 400, message: String(e) })
  }
})
