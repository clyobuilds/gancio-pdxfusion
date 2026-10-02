import { defineEventHandler } from 'h3'
import { pluginController } from '~~/server/services'

/**
 * @openapi
 * /api/plugins/{name}/{path}:
 *   get:
 *     summary: Get routeAPI
 *     description: Get plugin routeAPI.
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         description: Plugin name
 *         example: Example
 *         schema:
 *           type: string
 *       - name: path
 *         in: path
 *         description: Plugin path
 *         example: plugin/path
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The plugin routeAPI.
 *       400:
 *         description: Plugin name is required.
 *       403:
 *         description: Plugin is not enabled.
 *       404:
 *         description: Plugin or routeAPI method not found.
 *     tags:
 *       - Plugins
 */
export default defineEventHandler(async (evt) => {
  return pluginController.routeAPI(evt)
})