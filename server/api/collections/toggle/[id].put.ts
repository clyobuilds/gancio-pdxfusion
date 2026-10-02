import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { Collection } from '~~/server/services'

/**
 * @openapi
 * /api/collections/toggle/{id}:
 *   put:
 *     summary: Pin/unpin
 *     description: Pin a collection if it is unpinned, or unpin it otherwise. Admin role is required.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Identifier of the collection to pin/unpin.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: True if collection has been unpinned, false otherwise.
 *         content:
 *           application/json:
 *             schema:
 *               type: boolean
 *       404:
 *         description: This collection does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Collections
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  const collection = await Collection.findByPk(id)
  if (!collection) {
    throw createError({ statusCode: 404 })
  }

  await collection.update({ isTop: !collection.isTop })
  return !collection.isTop
})
