import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Collection } from '~~/server/services'

/**
 * @openapi
 * /api/collections/{id}:
 *   delete:
 *     summary: Delete collection
 *     description: Delete a collection by id. Admin role is required.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Identifier of the collection to be deleted.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Collection with identifier `id` deleted.
 *       404:
 *         description: Collection does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Collections
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('collection delete')
  const id = getRouterParam(event, 'id')

  const collection = await Collection.findByPk(id)
  if (!collection) {
    log.error('This collection does not exist: ', id)
    throw createError({ status: 404, message: 'This collection does not exists' })
  }

  return collection.destroy()
})
