import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Filter } from '~~/server/services'

/**
 * @openapi
 * /api/filters:
 *   post:
 *     summary: Create filter
 *     description: Create a filter. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FilterCreation'
 *     responses:
 *       200:
 *         description: The new filter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Filter'
 *       400:
 *         description: Could not create the filter.
 *       401:
 *         description: Unauthorized.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Filters
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('filter')

  const filter = await readBody(event)
  log.info(filter)

  try {
    return Filter.create(filter)
  } catch (e) {
    throw createError({ status: 400, message: String(e) })
  }
})