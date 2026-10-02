import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { enqueueMail, User, publicSettings } from '~~/server/services'

/**
 * @openapi
 * /api/user/{id}:
 *   put:
 *     summary: Update user
 *     description: Update user activation or role. When user is activated, a confirmation e-mail is sent with a link that allow to choose a password.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifier of the user to be updated.
 *         example: 1
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: Set if the user is enabled or not.
 *                 example: true
 *               role:
 *                 type: string
 *                 enum: [user,editor,admin]
 *                 description: Set the new role of the user.
 *                 example: user
 *     responses:
 *       200:
 *         description: User has been updated.
 *         content:
 *           application/json:
 *             $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const log = useLogger('user update')
  const id = getRouterParam(evt, 'id')
  const body = await readBody(evt)

  const user = await User.findByPk(id)
  if (!user) {
    log.error('This user does not exist: ', id)
    throw createError({ status: 404, message: 'This user does not exists' })
  }

  log.info(`Update user ${user.email} - ${JSON.stringify(body)}`)
  if ((!user.is_active && body.is_active)) {
    enqueueMail(user.email, 'confirm', { user, config: publicSettings }, publicSettings.instance_locale)
  }

  return user.update(body)
})
