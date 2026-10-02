import { defineEventHandler, readValidatedBody, createError } from 'h3'
import { Resource } from '~~/server/services'
import { useLogger } from '~~/server/lib/logger'
import { requireAdmin } from '~~/server/lib/auth'

import z from 'zod'

const schema = z.object({
  id: z.string()
})

/**
 * @openapi
 * /api/resources:
 *   delete:
 *     summary: Delete resource
 *     description: Delete resource permanently. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Resource identifier.
 *                 example: https://domain.org/path
 *     responses:
 *       200:
 *         description: Resource has been deleted.
 *       404:
 *         description: Resource not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Resources
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const log = useLogger('/api/resources')
  const body = await readValidatedBody(evt, schema.parse)
  const resource = await Resource.findByPk(body.id)
  if (!resource) {
    log.warn(`Resource not found: ${body.id}`)
    throw createError({ statusCode: 404 })
  }

  resource.destroy()
})
