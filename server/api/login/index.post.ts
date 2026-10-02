import { z } from 'zod'
import { readValidatedBody, defineEventHandler, createError } from 'h3'
import bcrypt from 'bcryptjs'
import { useLogger } from '~~/server/lib/logger'
import { User } from '~~/server/services'
import { setUserSession } from '~~/server/lib/session'

const bodySchema = z.object({
  email: z.string(), // TODO: .email(), // or admin
  password: z.string()
})

/**
 * @openapi
 * /api/login:
 *   post:
 *     summary: Log in
 *     description: Login a user.
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
 *               password:
 *                 type: string
 *                 example: password
 *     responses:
 *       200:
 *         description: User logged.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   example: admin@gancio.org
 *                 role:
 *                   type: string
 *                   enum: [user,editor,admin]
 *                   example: user
 *       401:
 *         description: Bad credentials.
 *     tags:
 *       - Login
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('login')
  // const body = await readBody(event)
  const { email, password } = await readValidatedBody(event, bodySchema.parse)
  log.info(`Login ${email}`)

  // search for the username
  const user = await User.withScope('withPassword').findOne({ where: { email, is_active: true } })
  if (!user || !password) {
    log.warn('E-mail not found or not active', email)
    throw createError({ status: 401, message: 'Bad credentials' })
  }

  // check if password matches
  if (await bcrypt.compare(password, user.password)) {
    // set the user session in the cookie
    // this server util is auto-imported by the auth-utils module
    await setUserSession(event, {
      id: user.id,
      email: user.email,
      role: user.role
    })
    log.info('Logged in ', user.email)
    return { email: user.email, role: user.role }
  } else {
    log.error('Bad credentials for ', user.email)
    throw createError({ statusCode: 401, message: 'Bad credentials' })
  }
})
