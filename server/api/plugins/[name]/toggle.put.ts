import { createError, getRouterParam, getValidatedQuery, defineEventHandler } from 'h3'
import z from 'zod'
import { requireAdmin } from '~~/server/lib/auth'
import { pluginController } from '~~/server/services'

const querySchema = z.object({
  enable: z.stringbool()
})

/**
 * @openapi
 * /api/plugins/{name}/toggle:
 *   put:
 *     summary: Enable/disable plugin
 *     description: Update plugin enabled status. Admin role is required.
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         description: Plugin name
 *         example: Example
 *         schema:
 *           type: string
 *       - name: enable
 *         in: query
 *         required: true
 *         description: Set enabled status
 *         example: true
 *         schema:
 *           type: boolean
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
 *         description: Plugin name is required or plugin is already enabled
 *       404:
 *         description: Plugin not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Plugins
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { enable } = await getValidatedQuery(event, querySchema.parse)

  const pluginName = getRouterParam(event, 'name')
  if (!pluginName) {
    throw createError({ statusCode: 400, message: 'Plugin name is required' })
  }

  const plugin = pluginController.getPlugin(pluginName)
  if (!plugin) throw createError({ statusCode: 404, message: 'Plugin not found' })

  if (enable === Boolean(plugin.settings?.enable)) {
    const message = enable ? 'Plugin is already enabled' : 'Plugin is already disabled'
    throw createError({ statusCode: 400, message })
  }

  await pluginController.togglePlugin(pluginName)

  return { success: true }
})
