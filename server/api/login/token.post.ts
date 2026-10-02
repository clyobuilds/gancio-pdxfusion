import { defineEventHandler, readValidatedBody, createError } from 'h3'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { signJwt } from '~~/server/lib/jwt'

import { useLogger } from '~~/server/lib/logger'
import { User } from '~~/server/services'

const bodySchema = z.object({
  email: z.string(), // TODO: .email(), // or admin
  password: z.string()
})

/**
 * @openapi
 * /api/login/token:
 *   post:
 *     summary: Get token
 *     description: Login via JWT. To interact with some API you'll need an `access_token` you'll get from this call.
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
 *         description: "A JSON response with an `access_token` property you have to use in `Authorization: Bearer <access_token>` header for authenticated request."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   example: YOUR_TOKEN
 *       401:
 *         description: Bad credentials.
 *     tags:
 *       - Login
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('login via API')
  const { email, password } = await readValidatedBody(event, bodySchema.parse)
  log.info(`Login ${email}`)

  // search for the username
  const user = await User.withScope('withPassword').findOne({ where: { email, is_active: true }, raw: true })
  if (!user || !password) {
    log.warn('E-mail not found or not active', email)
    throw createError({ status: 401, message: 'Bad credentials' })
  }

  // check if password matches
  if (await bcrypt.compare(password, user.password)) {
    // set the user session in the jwt token
    const access_token = await signJwt({
      id: user.id,
      email: user.email,
      role: user.role
    })
    return { access_token }
  } else {
    log.error('Bad credentials')
    throw createError({ statusCode: 401, message: 'Bad credentials' })
  }
})
