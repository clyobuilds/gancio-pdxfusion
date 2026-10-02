import { defineEventHandler, getRouterParam, createError, sendNoContent } from 'h3'
import { Op } from '@sequelize/core'
import { useLogger } from '~~/server/lib/logger'
import { Collection } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/collections/moveup/{index}:
 *   put:
 *     summary: Move up
 *     description: Move up a collection by swapping its sortIndex with the one above it. Admin role is required.
 *     parameters:
 *       - name: index
 *         in: path
 *         description: "`sortIndex` attribute of the collection to move up."
 *         required: true
 *         example: 3
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Collection has been moved up.
 *       404:
 *         description: "Collection with this `sortIndex` value does not exist."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Collections
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('collection moveup')
  const sortIndex = Number(getRouterParam(event, 'index'))

  try {
    const collections = await Collection.findAll({ where: { sortIndex: { [Op.lte]: sortIndex } }, limit: 2, order: [['sortIndex', 'desc']] })
    if (collections.length !== 2) {
      throw createError({ status: 404 })
    }

    const tmpSortIndex = collections[0].sortIndex
    await collections[0].update({ sortIndex: collections[1].sortIndex })
    await collections[1].update({ sortIndex: tmpSortIndex })

    return sendNoContent(event, 200)
  } catch (e) {
    log.error(e)
    throw createError({ status: 404 })
  }
})
