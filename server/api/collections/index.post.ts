import { defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { useLogger } from '~~/server/lib/logger'
import { Collection } from '~~/server/services'

/**
 * @openapi
 * /api/collections:
 *   post:
 *     summary: Create collection
 *     description: Create a collection. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isActor:
 *                 type: boolean
 *               isTop:
 *                 type: boolean
 *               sortIndex:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Created collection.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Collection'
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Collections
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const log = useLogger('collections')

  const collection = await readBody(event)
  log.info(collection)
  return Collection.create(collection)
})
