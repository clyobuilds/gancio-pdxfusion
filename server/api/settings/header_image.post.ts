import { defineEventHandler, createError, type MultiPartData } from 'h3'
import { parseMultipartFormData, saveUploadedImage } from '~~/server/lib/parseMultipartForm'
import { setSetting } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/settings/header_image:
 *   post:
 *     summary: Set header image
 *     description: Set header image. If no image is sent, `header_image` setting value will be `undefined`. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               header_image:
 *                 description: Header image.
 *     responses:
 *       200:
 *         description: Header image set or `undefined`.
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

  if (!body || !body?.header_image) {
    setSetting('header_image', undefined)
    throw createError({ statusCode: 200 })
  }

  await saveUploadedImage(body?.header_image as MultiPartData, 'custom_header_image')
  return setSetting('header_image', 'custom_header_image.png')
})
