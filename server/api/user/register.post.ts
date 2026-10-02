import { defineEventHandler, createError, readBody } from 'h3'
import * as linkify from 'linkifyjs'
import { useLogger } from '~~/server/lib/logger'
import { enqueueMail, publicSettings, User, notifyAdmins } from '~~/server/services'

// TODO flood protection

// TODO
// const userSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(8).max(100),
//   description: z.string().min(5).max(255).optional()
// })

/**
 * @openapi
 * /api/user/register:
 *   post:
 *     summary: Register user
 *     description: Register a new user. This will send an email to the user and to all the administrators. The first registered user will be an active admin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 required: true
 *                 description: User email
 *                 example: example@gancio.org
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: MY_PASSWORD
 *               description:
 *                 type: string
 *                 description: User description
 *                 example: A new user for gancio
 *     responses:
 *       200:
 *         description: User has been registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Creation error.
 *       404:
 *         description: Registration not allowed.
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('register')

  // const user = await readValidatedBody(event, userSchema.parse)
  const user = await readBody(event)

  if (!publicSettings.allow_registration) {
    throw createError({ status: 404, message: 'Not found' })
  }

  const n_users = await User.count()
  try {
    // the first registered user will be an active admin
    if (n_users === 0) {
      log.info('First registered user will be an admin')
      user.is_active = user.is_admin = true
      user.role = 'admin'

      const userInstance = await User.create(user)
      return userInstance.get({ plain: true })
    }

    // user.is_active = false
    // user.is_admin = false

    // check email
    if (!linkify.test(user.email, 'email')) {
      throw createError({ status: 400, statusMessage: 'Invalid email' })
    }

    log.info('Register user', user.email)
    const userInstance = await User.create(user)
    log.info(`Sending registration email to ${user.email} and registration confirmation to admins`)
    enqueueMail(user.email, 'register', { user, config: publicSettings }) // , TODO publicSettings.locals.locale)
    notifyAdmins('admin_register', { user, config: publicSettings })
    return userInstance
  } catch (e) {
    log.error(String(e))
    throw createError({ status: 400, statusMessage: String(e) })
  }
})
