import { defineEventHandler, createError } from 'h3'
import type { MultiPartData } from 'h3'
import { parseMultipartFormData, saveUploadedImage } from '~~/server/lib/parseMultipartForm'
import { setSetting } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/settings/logo:
 *   post:
 *     summary: Set logo
 *     description: Set logo. If no image is sent, `logo` setting value will be `undefined`. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 description: Logo image.
 *     responses:
 *       200:
 *         description: Logo is set or `undefined`.
 *         content:
 *           application/json:
 *             schema:
 *               anyOf:
 *                 - $ref: '#/components/schemas/Setting'
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                       description: Response value (200).
 *                       example: 200
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Settings
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const body = await parseMultipartFormData(evt)

  if (!body || !body?.logo) {
    setSetting('logo', undefined)
    throw createError({ status: 200 })
  }

  await saveUploadedImage(body?.logo as MultiPartData, 'custom_logo')
  return setSetting('logo', 'custom_logo.png')
})