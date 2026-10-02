import { defineEventHandler, readValidatedBody, createError } from 'h3'
import z from 'zod'
import { Resource } from '~~/server/services'
import { useLogger } from '~~/server/lib/logger'
import { requireAdmin } from '~~/server/lib/auth'

const schema = z.object({
  id: z.string(),
  hidden: z.coerce.boolean()
})

/**
 * @openapi
 * /api/resources:
 *   put:
 *     summary: Update resource
 *     description: Update a resource hidden state. Admin role is required.
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
 *               hidden:
 *                 type: boolean
 *                 description: Hide/show a resource.
 *                 example: true
 *     responses:
 *       200:
 *         description: The updated resource.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
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

  resource.update({ hidden: Boolean(body.hidden) })
})
