import { defineEventHandler, getRouterParam, getQuery } from 'h3'
import { sendEvents } from '~~/server/services'
import { getCollectionEvents } from '~~/server/services/collections'

/**
 * @openapi
 * /api/collections/{id}:
 *   get:
 *     summary: Get events
 *     description: Get events of a collection by name.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Name of the collection to get.
 *         required: true
 *         example: collection_test
 *         schema:
 *           type: string
  *       - name: start
 *         in: query
 *         description: "Start timestamp (default: now)."
 *         schema:
 *           type: integer
 *         example: 1784109600
 *       - name: end
 *         in: query
 *         description: End timestamp (optional).
 *         schema:
 *           type: integer
 *         example: 1784109600
 *       - name: show_multidate
 *         in: query
 *         description: "Show also multidate events (default: true)."
 *         schema:
 *           type: boolean
 *         example: false
 *       - name: show_recurrent
 *         in: query
 *         description: "Show also recurrent events (default: as choosen in admin settings)."
 *         schema:
 *           type: boolean
 *         example: false
 *       - name: show_federated
 *         in: query
 *         description: Show federated events too.
 *         schema:
 *           type: boolean
 *         example: false
 *       - name: limit
 *         in: query
 *         description: Limit events.
 *         schema:
 *           type: integer
 *         example: 100
 *       - name: page
 *         in: query
 *         description: Pagination.
 *         schema:
 *           type: integer
 *         example: 50
 *       - name: older
 *         in: query
 *         description: Select <= start instead of >=.
 *         schema:
 *           type: boolean
 *         example: true
 *       - name: reverse
 *         in: query
 *         description: Reverse order.
 *         schema:
 *           type: boolean
 *         example: true
 *     responses:
 *       200:
 *         description: Events of the collection with name `id`.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventAPI'
 *       404:
 *         description: Collection does not exist.
 *     tags:
 *       - Collections
 */
export default defineEventHandler(async (evt) => {
  // https://github.com/nitrojs/nitro/issues/3518
  const name = getRouterParam(evt, 'id', { decode: true }) as string
  const opt = getQuery(evt)
  return sendEvents(evt, await getCollectionEvents({ name, ...opt }))
})
