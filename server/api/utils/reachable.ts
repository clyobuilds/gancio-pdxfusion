import { defineEventHandler } from 'h3'
import { publicSettings } from '~~/server/services/settings'

/**
 * @openapi
 * /api/utils/reachable:
 *   get:
 *     summary: Check Gancio reachability
 *     description: Check Gancio reachability, trying during 5 seconds.
 *     responses:
 *       200:
 *         description: Gancio status.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: ready
 *     tags:
 *       - Utils
 */
export default defineEventHandler(() => {
  return $fetch(`${publicSettings.baseurl}/api/utils/ping`, { timeout: 5000 })
})
