import { defineEventHandler, createError, readBody } from 'h3'
import { sendMail, publicSettings, setSetting } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/settings/test_smtp:
 *   post:
 *     summary: Set SMTP
 *     description: Set SMTP settings and send a test email. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               auth:
 *                 type: object
 *                 properties:
 *                   user:
 *                     type: string
 *                     description: SMTP user
 *                     example: smtp@gancio.org
 *                   pass:
 *                     type: string
 *                     description: SMTP user password
 *                     example: password
 *               port:
 *                 type: integer
 *                 description: SMTP port
 *                 example: 465
 *               from:
 *                 type: string
 *                 description: Address used as the sender to send emails.
 *                 example: admin@gancio.org
 *               sendmail:
 *                 type: boolean
 *                 description: Use sendmail or not.
 *                 example: false
 *               secure:
 *                 type: boolean
 *                 description: SMTP secure (TLS or STARTTLS) or not.
 *                 example: true
 *               ignoreTLS:
 *                 type: boolean
 *                 description: Ignore TLS or not.
 *                 example: false
 *               requireTLS:
 *                 type: boolean
 *                 description: Require TLS or not.
 *                 example: true
 *     responses:
 *       200:
 *         description: SMTP setting set and test email sent.
 *       400:
 *         description: Email could not be sent.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Settings
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const setting = await readBody(event)
  await setSetting('smtp', setting)
  try {
    sendMail(publicSettings.admin_email, 'test')
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: String(e) })
  }
})