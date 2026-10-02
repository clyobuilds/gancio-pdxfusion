import { defineEventHandler } from 'h3'
import { Op } from '@sequelize/core'
import { APUser, Event, Resource, Instance } from '~~/server/services'

/**
 * @openapi
 * /api/ap_actors/stats:
 *   get:
 *     summary: Get stats
 *     description: Get AP actors stats.
 *     responses:
 *       200:
 *         description: AP actors stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 n_followers:
 *                   type: integer
 *                   description: Number of followers.
 *                   example: 100
 *                 n_events:
 *                   type: integer
 *                   description: Number of federated events.
 *                   example: 200
 *                 n_resources:
 *                   type: integer
 *                   description: Number of resources.
 *                   example: 200
 *     tags:
 *       - AP Actors
 */
export default defineEventHandler(async () => {
  const n_followers = await APUser.count({ where: { follower: true }, include: [Instance] })
  const n_events = await Event.count({ where: { ap_id: { [Op.not]: null } } })
  const n_resources = await Resource.count()
  return ({ n_followers, n_events, n_resources })
})