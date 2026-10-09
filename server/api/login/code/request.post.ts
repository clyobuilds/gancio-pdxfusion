import { defineEventHandler, readBody, createError } from 'h3'
import * as linkify from 'linkifyjs'
import { useLogger } from '~~/server/lib/logger'
import { User, enqueueMail, publicSettings } from '~~/server/services'
import { createLoginCode } from '~~/server/services/loginCodes'

/**
 * @openapi
 * /api/login/code/request:
 *   post:
 *     summary: E-mail me a login code
 *     description: Sends a 6-digit code to the address when it has an active account. With `register`, it also sends one to a new
 *       address when sign-up is open. Always answers the same way, so it does not reveal which addresses have accounts.
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
 *               register:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       204:
 *         description: Request received.
 *     tags:
 *       - Login
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('login/code/request')
  const { email, register } = await readBody(event)
  if (typeof email !== 'string' || !email.trim()) {
    throw createError({ status: 400, message: 'Missing e-mail' })
  }
  const address = email.trim()

  const user = await User.findOne({ where: { email: address, is_active: true } })
  const mayRegister = !!register && publicSettings.allow_registration && linkify.test(address, 'email')

  if (user || mayRegister) {
    const code = createLoginCode(address)
    if (code) {
      enqueueMail(address, 'login_code', { code, user: user ?? { email: address }, config: publicSettings }, event.context.locale)
    } else {
      log.warn('Login code asked again too soon', address)
    }
  } else {
    log.warn('No active account, or sign-up closed', address)
  }
})
