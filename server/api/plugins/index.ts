import { defineEventHandler } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { pluginController, publicSettings } from '~~/server/services'

/**
 * @openapi
 * /api/plugins:
 *   get:
 *     summary: Get plugins
 *     description: Get plugins manifests. Admin role is required.
 *     responses:
 *       200:
 *         description: List of plugins manifests.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Plugin name.
 *                     example: Example
 *                   version:
 *                     type: string
 *                     description: Plugin version.
 *                     example: "1.0"
 *                   author:
 *                     type: string
 *                     description: Plugin author.
 *                     example: lesion
 *                   url:
 *                     type: string
 *                     description: Plugin URL.
 *                     example: https://framagit.org/les/gancio
 *                   description:
 *                     type: string
 *                     description: Plugin description.
 *                     example: An example plugin to show how to create a plugin for Gancio.
 *                   settings:
 *                     type: object
 *                     description: Plugin settings.
 *                     example:
 *                       my_plugin_string_setting:
 *                         type: TEXT
 *                         description: My plugin string setting.
 *                         required: true
 *                         hint: My plugin setting support <strong>html too</strong>
 *                       enable_this_feature_in_my_plugin:
 *                         type: CHECK
 *                         description: My plugin best feature.
 *                         hint: This feature is super dupe, enable it!
 *                   settingsValue:
 *                     type: object
 *                     description: Plugin public settings.
 *                     example:
 *                       enable: true
 *
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Plugins
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  // return plugins and inner settings
  return pluginController.plugins.map(({ manifest }) => {
    if (publicSettings['plugin_' + manifest.name]) {
      return { ...manifest, settingsValue: publicSettings['plugin_' + manifest.name] }
    }
    return manifest
  })
})
