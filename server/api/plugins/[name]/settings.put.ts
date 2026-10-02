import { createError, getRouterParam, readBody, defineEventHandler } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { pluginController } from '~~/server/services'

/**
 * @openapi
 * /api/plugins/{name}/settings:
 *   put:
 *     summary: Update plugin settings
 *     description: Update plugin settings. Admin role is required.
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
 *         description: Plugin settings have been updated.
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
 *         description: Plugin name is required.
 *       404:
 *         description: Plugin not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Plugins
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const pluginName = getRouterParam(event, 'name')
  if (!pluginName) {
    throw createError({ statusCode: 400, message: 'Plugin name is required' })
  }

  const plugin = pluginController.getPlugin(pluginName)
  if (!plugin) {
    throw createError({ statusCode: 404, message: 'Plugin not found' })
  }

  const body = await readBody(event)

  const wasEnabled = plugin.settings?.enable

  if (wasEnabled) {
    await pluginController.disablePlugin(plugin)
  }

  await pluginController.setSettings(plugin, body)

  // reload plugin with new settings
  if (wasEnabled) {
    await pluginController.enablePlugin(plugin)
  }

  return { success: true }
})
