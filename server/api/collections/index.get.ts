import { defineEventHandler, getValidatedQuery } from 'h3'
import z from 'zod'
import { handleCache } from '~~/server/lib/API'
import { Collection, Filter } from '~~/server/services'

const queryParams = z.object({
  withFilters: z.stringbool().optional(),
  pin: z.stringbool().optional()
})

/**
 * @openapi
 * /api/collections:
 *   get:
 *     summary: Get collections
 *     description: Get collections.
 *     parameters:
 *       - name: withFilters
 *         in: query
 *         description: Indicates if including filters in the response or not (used in admin panel).
 *         schema:
 *           type: boolean
 *         example: true
 *       - name: pin
 *         in: query
 *         description: Only retrieve collections that are pinned (used in homepage).
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
 *                 $ref: '#/components/schemas/Collection'
 *     tags:
 *       - Collections
 */
export default defineEventHandler(async (evt) => {
  const { withFilters, pin } = await getValidatedQuery(evt, queryParams.parse)

  if (withFilters) {
    return Collection.findAll({ include: [Filter], order: [['sortIndex', 'asc']] })
  } else {
    if (await handleCache(evt, Collection)) return
    if (pin) {
      return Collection.findAll({ where: { isTop: true }, attributes: ['id', 'name'], order: [['sortIndex', 'asc']] })
    } else {
      return Collection.findAll({ order: [['sortIndex', 'asc']] })
    }
  }
})
