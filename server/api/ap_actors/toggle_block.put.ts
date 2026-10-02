import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { APUser, Instance } from '~~/server/services'
const schema = z.object({
  ap_id: z.string()
})

/**
 * @openapi
 * /api/ap_actors/toggle_block:
 *   put:
 *     summary: Block/unblock
 *     description: Block an AP actor if is unblocked, or unblock otherwise. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ap_id:
 *                 type: string
 *                 description: AP identifier.
 *                 example: https://ap_domain/relay
 *     responses:
 *       200:
 *         description: AP actor has been blocked/unblocked.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APUser'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: AP actor does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - AP Actors
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const log = useLogger('toggle_block')
  const { ap_id } = await readValidatedBody(event, schema.parse)

  const ap_actor = await APUser.findByPk(ap_id, { include: Instance })
  if (!ap_actor) {
    log.warn('This ap user does not exists: ', ap_id)
    throw createError({ status: 404, message: 'This ap user does not exists' })
  }

  await ap_actor.update({ blocked: !ap_actor.blocked })
  log.info(`ap_user "${ap_actor.ap_id}" ${ap_actor.blocked ? 'blocked' : 'unblocked'}`)
})
