import { defineEventHandler, readBody, createError } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { User } from '~~/server/services'

/**
 * @openapi
 * /api/user/check_recover_code:
 *   post:
 *     summary: Check recover code
 *     description: Check if a recover code corresponds to an existing user.
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
 *     responses:
 *       200:
 *         description: Returns the corresponding user email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   description: User email with this recover code.
 *                   example: example@gancio.org
 *       400:
 *         description: No recover code.
 *       404:
 *         description: User not found.
 *     tags:
 *       - Users
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('user/check_recover_code')
  const { recover_code } = await readBody(event)
  if (!recover_code) {
    throw createError({ status: 400 })
  }

  const user = await User.findOne({ where: { recover_code } })
  if (!user) {
    log.error('User not found')
    throw createError({ status: 404 })
  }

  return { email: user.email }
})