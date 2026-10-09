import { defineEventHandler, readValidatedBody, createError } from 'h3'
import { z } from 'zod'
import { useLogger } from '~~/server/lib/logger'
import { User } from '~~/server/services'
import { setUserSession } from '~~/server/lib/session'
import { checkLoginCode } from '~~/server/services/loginCodes'

const bodySchema = z.object({
  email: z.string().trim(),
  code: z.string().trim().regex(/^\d{6}$/)
})

/**
 * @openapi
 * /api/login/code/verify:
 *   post:
 *     summary: Log in with an e-mail code
 *     description: Logs the user in when the 6-digit code from the e-mail is right and not used or expired.
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
 *     responses:
 *       200:
 *         description: User logged in.
 *       401:
 *         description: Wrong, expired or used code.
 *     tags:
 *       - Login
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('login/code/verify')
  const { email, code } = await readValidatedBody(event, bodySchema.parse)

  const user = await User.findOne({ where: { email, is_active: true } })
  if (!user || !checkLoginCode(user.email, code)) {
    log.warn('Wrong or expired login code', email)
    throw createError({ statusCode: 401, message: 'Bad credentials' })
  }

  await setUserSession(event, { id: user.id, email: user.email, role: user.role })
  log.info('Logged in with a code', user.email)
  return { email: user.email, role: user.role }
})
