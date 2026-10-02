import { eventHandler } from 'h3'
import { getLegacyUserSession, getUserSession } from '~~/server/lib/session'
import { User } from '~~/server/services'

/**
 * @openapi
 * /api/session:
 *   get:
 *     summary: Get session user
 *     description: Get user of the current session.
 *     responses:
 *       200:
 *         description: The user session.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       204:
 *         description: No session.
 *     tags:
 *       - Session
 */
export default eventHandler(async (event) => {
  let user = await getUserSession(event)

  if (!user) {
    user = await getLegacyUserSession(event)
  }

  // check if user exists and is enabled
  if (user) return User.findByPk(user.id, { where: { is_active: true }, attributes: ['id', 'email', 'role'], raw: true })
})