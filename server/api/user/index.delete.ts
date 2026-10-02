import { defineEventHandler, createError } from 'h3'
import { Event, User } from '~~/server/services'
import { useLogger } from '~~/server/lib/logger'
import { requireUser } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/user:
 *   delete:
 *     summary: Delete current user
 *     description: Delete the current authenticated user and disassociate all events created by this user.
 *     responses:
 *       200:
 *         description: Current user deleted.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User does not exist.
 *       500:
 *         description: Error deleting user.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('user self delete')
  const user = await requireUser(event)
  const userInstance = await User.findByPk(user.id)
  if (!userInstance) {
    throw createError({ status: 404, message: 'This user does not exists' })
  }

  log.info(`User ${user.id} (${user.email}) is deleting their own account`)

  try {
    // disassociate all events created by this user
    await Event.update({ userId: undefined }, { where: { userId: user.id } })
    return userInstance.destroy()
  } catch (e) {
    log.error('Error deleting user:', e)
    throw createError({ status: 500, message: 'Error deleting user' })
  }
})