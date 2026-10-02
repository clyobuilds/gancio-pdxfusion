import { defineEventHandler, getRouterParam } from 'h3'
import { getUser } from '~~/server/lib/getUser'
import { Resource } from '~~/server/services'

/**
 * @openapi
 * /api/resources/list/{id}:
 *   get:
 *     summary: Get event resources
 *     description: Get all resources of an event.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Event identifier.
 *         example: 4
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event resources.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               description: List of resources.
 *               items:
 *                 $ref: '#/components/schemas/Resource'
 *     tags:
 *       - Resources
 */
export default defineEventHandler(async (evt) => {
  const eventId = getRouterParam(evt, 'id')
  const user = await getUser(evt)
  const isAdminOrEditor = ['admin', 'editor'].includes(user?.role ?? '')

  const resources = await Resource.findAll({
    where: {
      eventId,
      ...(!isAdminOrEditor && { 'hidden': false, '$APUser.blocked$': false })
    },
    attributes: ['activitypub_id', 'data', 'createdAt', 'updatedAt', 'hidden'],
    include: [
      { association: 'APUser', required: false, attributes: ['ap_id', 'object', 'blocked'] }
    ],
    order: [['createdAt', 'ASC']]
  })
  return resources
})
