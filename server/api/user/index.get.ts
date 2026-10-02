import { defineEventHandler } from 'h3'
import { requireUser } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/user:
 *   get:
 *     summary: Get current user
 *     description: Get current authenticated user.
 *     responses:
 *       200:
 *         description: The authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: User identifier
 *                   example: 1
 *                 email:
 *                   type: string
 *                   description: User email
 *                   example: example@gancio.org
 *                 role:
 *                   $ref: '#/components/schemas/UserRole'
 *       400:
 *         description: Failed to get authenticated user.
 *       401:
 *         description: Unauthorized.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return user
})
