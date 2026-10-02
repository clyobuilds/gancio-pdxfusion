import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Filter } from '~~/server/services'

/**
 * @openapi
 * /api/filters/{id}:
 *   put:
 *     summary: Update filter
 *     description: Update a filter by `id`. Admin role is required.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the filter to update.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FilterCreation'
 *     responses:
 *       200:
 *         description: The updated filter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Filter'
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
  const log = useLogger('Filter put')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const filter = await Filter.findByPk(id)
  if (!filter) {
    log.error('This filter does not exist: ', id)
    throw createError({ status: 404, message: 'This filter does not exists' })
  }

  return filter.update(body)
})