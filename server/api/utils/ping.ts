import { defineEventHandler } from 'h3'
import { publicSettings } from '~~/server/services'

/**
 * @openapi
 * /api/utils/ping:
 *   get:
 *     summary: Get Gancio status
 *     description: Get Gancio status.
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
export default defineEventHandler(() => publicSettings.status)
