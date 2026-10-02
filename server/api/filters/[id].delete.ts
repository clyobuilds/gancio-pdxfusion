import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Filter } from '~~/server/services'

/**
 * @openapi
 * /api/filters/{id}:
 *   delete:
 *     summary: Remove filter
 *     description: Remove a filter by `id`. Admin role is required.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the filter to remove.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The filter has been removed.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Filter does not exist.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Filters
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('filter delete')
  const id = getRouterParam(event, 'id')

  const filter = await Filter.findByPk(id)
  if (!filter) {
    log.error('This filter does not exist: ', id)
    throw createError({ status: 404, message: 'This filter does not exists' })
  }

  return filter.destroy()
})