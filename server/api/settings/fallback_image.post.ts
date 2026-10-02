import { defineEventHandler, createError, type MultiPartData } from 'h3'
import { parseMultipartFormData, saveUploadedImage } from '~~/server/lib/parseMultipartForm'
import { setSetting } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/settings/fallback_image:
 *   post:
 *     summary: Set fallback image
 *     description: Set fallback image. If no image is sent, `fallback_image` setting value will be `undefined`. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fallback_image:
 *                 description: Fallback image for non image events.
 *     responses:
 *       200:
 *         description: Fallback image set or `undefined`.
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

  if (!body || !body?.fallback_image) {
    setSetting('fallback_image', undefined)
    throw createError({ statusCode: 200 })
  }

  await saveUploadedImage(body?.fallback_image as MultiPartData, 'custom_fallback_image')
  return setSetting('fallback_image', 'custom_fallback_image.png')
})