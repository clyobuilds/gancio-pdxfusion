import { defineEventHandler, getRouterParam, createError } from 'h3'
import { Event, User } from '~~/server/services'
import { useLogger } from '~~/server/lib/logger'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/user/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user by id and disassociate all events created by this user. Admin role is required.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the user to be deleted.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User with identifier `id` deleted.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('user delete')
  const id = getRouterParam(event, 'id')

  const user = await User.findByPk(id)
  if (!user) {
    log.error('This user does not exist: ', id)
    throw createError({ status: 404, message: 'This user does not exists' })
  }

  await Event.update({ userId: null }, { where: { userId: user.id } })
  return user.destroy()
})