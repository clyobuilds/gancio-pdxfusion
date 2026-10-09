import { defineEventHandler, readBody } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { User, enqueueMail, publicSettings } from '~~/server/services'
import { createLoginCode } from '~~/server/services/loginCodes'

/**
 * @openapi
 * /api/login/code/request:
 *   post:
 *     summary: E-mail me a login code
 *     description: Sends a 6-digit login code to the account's e-mail address, if the account exists. Always answers the same way,
 *       so it does not reveal which addresses have accounts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gancio.org
 *     responses:
 *       204:
 *         description: Request received.
 *     tags:
 *       - Login
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('login/code/request')
  const { email } = await readBody(event)

  const user = typeof email === 'string' && email
    ? await User.findOne({ where: { email: email.trim(), is_active: true } })
    : null

  if (user) {
    const code = createLoginCode(user.email)
    if (code) {
      enqueueMail(user.email, 'login_code', { code, user, config: publicSettings }, event.context.locale)
    } else {
      log.warn('Login code asked again too soon', user.email)
    }
  } else {
    log.warn('User not found', email)
  }
})
