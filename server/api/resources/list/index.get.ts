import { defineEventHandler, getValidatedQuery } from 'h3'
import { Resource } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

import z from 'zod'
import type { Paginated } from '~~/server/types/pagination'
import type { WhereOptions } from '@sequelize/core'
import { fn, Op, sql, where } from '@sequelize/core'
import { jsonPath } from '~~/server/services/db'

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(15),
  query: z.string().optional()
})

/**
 * @openapi
 * /api/resources/list:
 *   get:
 *     summary: Get resources
 *     description: Get all resources. Admin role is required.
 *     parameters:
 *       - name: query
 *         in: query
 *         description: Search text in resource (in resource data, AP actor or event)
 *         example: myevent
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         description: Get resources from this number of page.
 *         example: 3
 *         schema:
 *           type: integer
 *       - name: pageSize
 *         in: query
 *         description: Number of resources in each page.
 *         example: 10
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Filtered resources.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   description: List of resources.
 *                   items:
 *                     $ref: '#/components/schemas/Resource'
 *                 count:
 *                   type: integer
 *                   description: Number of resources
 *                   example: 34
 *                 totalPages:
 *                   type: integer
 *                   description: Number of pages
 *                   example: 4
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Resources
 */
export default defineEventHandler(async (evt): Promise<Paginated<Resource>> => {
  await requireAdmin(evt)
  const params = await getValidatedQuery(evt, schema.parse)

  const andWhere: WhereOptions<Resource> = []

  if (params.query) {
    andWhere.push({
      [Op.or]: [
        where(fn('LOWER', jsonPath('data', ['content'])), Op.like, '%' + params.query + '%'),
        where(fn('LOWER', sql.attribute('apUserApId')), Op.like, '%' + params.query + '%'),
        where(fn('LOWER', sql.attribute('$event.title$')), Op.like, '%' + params.query + '%')
      ]
    })
  }

  const result = await Resource.findAndCountAll({
    include: [
      { association: 'APUser', attributes: ['ap_id', 'object', 'blocked'] },
      { association: 'event', attributes: ['id', 'title', 'slug'] }
    ],
    where: andWhere,
    offset: (params.page - 1) * params.pageSize,
    limit: params.pageSize,
    order: [['createdAt', 'DESC']]
  })

  return {
    data: result.rows,
    count: result.count,
    totalPages: Math.ceil(result.count / params.pageSize)
  }
})
