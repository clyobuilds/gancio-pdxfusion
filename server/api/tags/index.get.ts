import { defineEventHandler, getValidatedQuery } from 'h3'
import { Event, Tag } from '~~/server/services'
import { Op, fn, col } from '@sequelize/core'

import { z } from 'zod'
import { normalizeTag } from '~~/server/services/tags'

const schema = z.object({
  query: z.string().trim().optional().transform(q => q && normalizeTag(q))
})

export default defineEventHandler(async (event) => {
  const { query } = await getValidatedQuery(event, schema.parse)
  const tags = await Tag.findAll({
    order: [[fn('COUNT', col('tag')), 'DESC']],
    attributes: ['tag'],
    where: query
      ? { normalizedTag: { [Op.like]: `%${query}%` } }
      : undefined,
    include: [{ model: Event, where: { is_visible: true }, attributes: [], through: { attributes: [] }, required: true }],
    group: ['tag'],
    limit: 10,
    raw: true,
    subQuery: false
  })

  return tags.map(t => t.tag)
})