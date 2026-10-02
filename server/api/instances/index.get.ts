import { defineEventHandler } from 'h3'
import { col, fn } from '@sequelize/core'
import { APUser, Instance } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/instances:
 *   get:
 *     summary: Get instances
 *     description: Get all instances. Admin role is required.
 *     responses:
 *       200:
 *         description: Instances data.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   domain:
 *                     type: string
 *                     description: Instance domain.
 *                     example: mastodon.example.org
 *                   name:
 *                     type: string
 *                     description: Instance name.
 *                     example: Mastodon Name
 *                   blocked:
 *                     type: boolean
 *                     description: It is a blocked instance or not.
 *                     example: false
 *                   users:
 *                     type: integer
 *                     description: Instance number of users.
 *                     example: 5
 *                   usage:
 *                     type: object
 *                     description: Instance usage data.
 *       401:
 *         decription: Unauthorized.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Instances
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const instances = await Instance.findAll({
    attributes: [
      'domain',
      'name',
      'blocked',
      'data',
      [fn('COUNT', col('APUsers.ap_id')), 'users']
    ],
    order: [['users', 'DESC']],
    group: ['domain'],
    include: [
      { model: APUser, attributes: [] }
    ]
  })
  // return instances
  return instances.map((i) => {
    const { data, ...instance } = i.get({ plain: true })
    return {
      ...instance,
      usage: data.usage
    }
  })
})
