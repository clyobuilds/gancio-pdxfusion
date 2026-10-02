import { defineEventHandler, getValidatedQuery } from 'h3'
import type { WhereOptions } from '@sequelize/core'
import { z } from 'zod'
import { APUser, Instance } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

const schema = z.object({
  instance: z.string().optional()
})

/**
 * @openapi
 * /api/ap_actors:
 *   get:
 *     summary: Get AP actors
 *     description: Get all AP actors. Admin role is required.
 *     responses:
 *       200:
 *         description: All AP actors.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ap_id:
 *                     type: string
 *                     description: AP identifier.
 *                     example: "https://ap_domain/relay"
 *                   following:
 *                     type: boolean
 *                     description: Indicates if AP actor is following or not.
 *                     example: false
 *                   trusted:
 *                     type: boolean
 *                     description: Indicates if AP actor is trusted or not.
 *                     example: false
 *                   blocked:
 *                     type: boolean
 *                     description: Indicates if AP actor is blocked or not.
 *                     example: false
 *                   follower:
 *                     type: boolean
 *                     description: Indicates if AP actor is follower or not.
 *                     example: false
 *                   url:
 *                     type: string
 *                     description: AP actor url.
 *                     example: "https://ap_domain.org/relay"
 *                   icon:
 *                     type: string
 *                     description: AP actor icon url.
 *                     example: "https://ap_domain.org/logo.png"
 *                   name:
 *                     type: string
 *                     description: AP actor name.
 *                     example: Name
 *                   preferredUsername:
 *                     type: string
 *                     description: AP actor preferred user name.
 *                     example: Preferred user name
 *                   summary:
 *                     type: string
 *                     description: AP actor summary.
 *                     example: Summary
 *                   domain:
 *                     type: string
 *                     description: AP domain.
 *                     example: ap_domain.org
 *                   software:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: AP software name.
 *                         example: gancio
 *                       version:
 *                         type: string
 *                         description: AP software version.
 *                         example: 2.0
 *       401:
 *         description: Unauthorized.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - AP Actors
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = await getValidatedQuery(event, schema.parse)

  const where: WhereOptions<APUser> = {}
  if (query.instance) {
    where.instanceDomain = query.instance
  }

  const users = await APUser.findAll({ where, include: [{ model: Instance, required: true }] })
  return users.map(t => ({
    ap_id: t.ap_id,
    following: t.following,
    trusted: t.trusted,
    blocked: t.blocked,
    follower: t.follower,
    url: t.object.url,
    icon: t.object?.icon?.url,
    name: t.object.name,
    preferredUsername: t.object.preferredUsername,
    summary: t.object.summary,
    domain: t.instance?.domain,
    software: {
      name: t.instance?.data?.software?.name ?? '',
      version: t.instance?.data?.software?.version ?? ''
    }
  }))
})
