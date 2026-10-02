import { defineEventHandler, readValidatedBody, createError } from 'h3'
import z from 'zod'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Instance } from '~~/server/services'

const schema = z.object({
  domain: z.string(),
  blocked: z.coerce.boolean()
})

/**
 * @openapi
 * /api/instances/block:
 *   put:
 *     summary: Block/unblock
 *     description: Block/unblock instance. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               domain:
 *                 type: string
 *                 description: Instance domain.
 *                 example: mastodon.example.org
 *               blocked:
 *                 type: boolean
 *                 description: Block instance or not.
 *                 example: true
 *     responses:
 *       204:
 *         description: Instance has been blocked/unblocked.
 *       401:
 *         decription: Unauthorized.
 *       404:
 *         description: Instance not found.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Instances
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const log = useLogger('instance')

  const { domain, blocked } = await readValidatedBody(event, schema.parse)

  const instance = await Instance.findByPk(domain)
  if (!instance) {
    log.warn('Instance not found "%s"', domain)
    throw createError({ status: 404, message: 'Instance not found' })
  }

  instance.update({ blocked })
})
