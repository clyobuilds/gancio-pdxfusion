import { defineEventHandler, readValidatedBody, createError } from 'h3'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import * as linkify from 'linkifyjs'
import { useLogger } from '~~/server/lib/logger'
import { User, notifyAdmins, publicSettings } from '~~/server/services'
import { setUserSession } from '~~/server/lib/session'
import { checkLoginCode } from '~~/server/services/loginCodes'

const bodySchema = z.object({
  email: z.string().trim(),
  code: z.string().trim().regex(/^\d{6}$/),
  register: z.boolean().optional(),
  description: z.string().trim().max(2000).optional()
})

/**
 * @openapi
 * /api/login/code/verify:
 *   post:
 *     summary: Log in with an e-mail code, or sign up with one
 *     description: Logs an active user in when the 6-digit code is right, not used and not expired.
 *       With `register` and an unknown address (sign-up open), it creates an account waiting for approval (the first account
 *       becomes an active admin) and tells the admins. `description` says what the person wants to publish.
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
 *               code:
 *                 type: string
 *                 example: "123456"
 *               register:
 *                 type: boolean
 *                 example: false
 *               description:
 *                 type: string
 *                 example: Monthly socials and workshops
 *     responses:
 *       200:
 *         description: Logged in, or sign-up received (`pending: true`).
 *       400:
 *         description: Missing description or invalid e-mail.
 *       401:
 *         description: Wrong, expired or used code.
 *       409:
 *         description: An account already exists for this address.
 *     tags:
 *       - Login
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('login/code/verify')
  const { email, code, register, description } = await readValidatedBody(event, bodySchema.parse)

  const user = await User.findOne({ where: { email, is_active: true } })
  if (user) {
    if (!checkLoginCode(user.email, code)) {
      log.warn('Wrong or expired login code', email)
      throw createError({ statusCode: 401, message: 'Bad credentials' })
    }
    await setUserSession(event, { id: user.id, email: user.email, role: user.role })
    log.info('Logged in with a code', user.email)
    return { email: user.email, role: user.role }
  }

  if (!register || !publicSettings.allow_registration) {
    log.warn('Wrong or expired login code', email)
    throw createError({ statusCode: 401, message: 'Bad credentials' })
  }
  if (!linkify.test(email, 'email')) {
    throw createError({ statusCode: 400, message: 'Invalid e-mail' })
  }
  if (!description) {
    throw createError({ statusCode: 400, message: 'Missing description' })
  }
  if (!checkLoginCode(email, code)) {
    log.warn('Wrong or expired sign-up code', email)
    throw createError({ statusCode: 401, message: 'Bad credentials' })
  }
  // an account that exists but is still waiting for approval
  if (await User.findOne({ where: { email } })) {
    throw createError({ statusCode: 409, message: 'Already registered' })
  }

  // the first account on a new site is an active admin; later ones wait for an admin to approve them
  const existing = await User.count()
  const first = existing === 0
  // the password is random: the person logs in with e-mail codes, and can still reset a password if they want one
  const created = await User.create({
    email,
    password: randomUUID(),
    description,
    role: first ? 'admin' : 'user',
    is_active: first
  })
  log.info('Sign-up with a code', email, first ? '(first, admin)' : '(waiting for approval)')

  if (first) {
    await setUserSession(event, { id: created.id, email: created.email, role: created.role })
    return { email: created.email, role: created.role, pending: false }
  }
  notifyAdmins('admin_register', { user: created, config: publicSettings })
  return { pending: true }
})
