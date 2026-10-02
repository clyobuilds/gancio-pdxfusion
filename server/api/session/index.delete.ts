import { defineEventHandler } from 'h3'
import { clearUserSession } from '~~/server/lib/session'

/**
 * @openapi
 * /api/session:
 *   delete:
 *     summary: Clear session
 *     description: Clear current user session.
 *     responses:
 *       200:
 *         description: The user session has been cleared.
 *     tags:
 *       - Session
 */
export default defineEventHandler(async (event) => {
  return clearUserSession(event)
})