import { defineEventHandler } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { User } from '~~/server/services'

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get users
 *     description: Get all users. Admin role is required.
 *     responses:
 *       200:
 *         description: All users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('users')
  await requireAdmin(event)
  log.info('Fetching all users')
  return User.findAll()
})