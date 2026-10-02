import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { User, enqueueMail, publicSettings } from '../../services'
import { useLogger } from '~~/server/lib/logger'

/**
 * @openapi
 * /api/user:
 *   post:
 *     summary: Create user
 *     description: Create a new user. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 required: true
 *                 description: User email.
 *                 example: example@gancio.org
 *               description:
 *                 type: string
 *                 description: User description.
 *                 example: A new user for gancio
 *               role:
 *                 type: string
 *                 enum: [user,editor,admin]
 *                 description: User role.
 *                 example: user
 *     responses:
 *       200:
 *         description: Created user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: If user creation fails (e.g. email already exists).
 *       401:
 *         description: Unauthorized.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('user')

  const newUser = await readBody(event)
  log.info(newUser)

  try {
    newUser.recover_code = crypto.randomUUID()
    newUser.is_active = true
    const user = await User.create(newUser)
    enqueueMail(user.email, 'user_confirm', { user, config: publicSettings })
    // refetch user with the default scope (without password or recover code)
    return User.findByPk(user.id)
  } catch (e) {
    log.error('User creation error:', e)
    throw createError({ status: 400, message: String(e) })
  }
})
