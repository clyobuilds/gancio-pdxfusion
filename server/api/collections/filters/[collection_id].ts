import { defineEventHandler, getRouterParam } from 'h3'
import { Filter } from '~~/server/services'

/**
 * @openapi
 * /api/collections/filters/{collection_id}:
 *   get:
 *     summary: Get collection filters
 *     description: Get collection filters.
 *     parameters:
 *       - name: collection_id
 *         in: path
 *         description: Collection identifier
 *         required: true
 *         example: 2
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Filters of the collection with identifier `id`.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Filter'
 *       404:
 *         description: Collection does not exist.
 *     tags:
 *       - Collections
 */
export default defineEventHandler(async (event) => {
  const collectionId = getRouterParam(event, 'collection_id')
  return Filter.findAll({ where: { collectionId } })
})
