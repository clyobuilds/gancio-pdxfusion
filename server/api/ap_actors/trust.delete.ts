import { defineEventHandler, readValidatedBody, createError } from 'h3'
import { z } from 'zod'
import { unfollowActor } from '~~/server/federation/helpers'
import { APUser } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

const schema = z.object({
  ap_id: z.string()
})

/**
 * @openapi
 * /api/ap_actors/trust:
 *   delete:
 *     summary: Untrust
 *     description: Untrust and unfollow an AP actor. Admin role is required.
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
 *         description: AP actor has been untrusted.
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
  const body = await readValidatedBody(event, schema.parse)

  const ap_actor = await APUser.findByPk(body.ap_id) // , { include: Instance })
  if (!ap_actor || !ap_actor.trusted) {
    throw createError({ status: 404, message: 'This ap user does not exists or not trusted' })
  }

  if (ap_actor.following) {
    // unfollow
    await unfollowActor(ap_actor).catch(() => { })
  }

  // remove trust
  await ap_actor.update({ trusted: false })
})