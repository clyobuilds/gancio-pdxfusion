import { readBody, defineEventHandler, createError, setResponseStatus } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { User } from '~~/server/services'

/**
 * @openapi
 * /api/user/recover_password:
 *   post:
 *     summary: Change password
 *     description: Change password through a recover code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recover_code:
 *                 type: string
 *                 description: User recover code.
 *                 example: MY_RECOVER_CODE
 *               password:
 *                 type: string
 *                 description: User new password.
 *                 example: MY_NEW_PASSWORD
 *     responses:
 *       201:
 *         description: User password has been updated.
 *       400:
 *         description: Wrong password or recover code.
 *       404:
 *         description: User not found.
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('user/recover')

  const { recover_code, password } = await readBody(event)
  if (!recover_code || !password) {
    throw createError({ statusCode: 400, message: 'Wrong password or recover code' })
  }

  const user = await User.findOne({ where: { recover_code, is_active: true } })
  if (!user) {
    log.error('User not found')
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  try {
    await user.update({ recover_code: '', password })
    setResponseStatus(event, 201)
  } catch {
    setResponseStatus(event, 400)
  }
})
