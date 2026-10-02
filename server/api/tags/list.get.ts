import { defineEventHandler } from 'h3'
import { Event, Tag } from '~~/server/services'
import { fn, col } from '@sequelize/core'
import { requireAdmin } from '~~/server/lib/auth'

export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const tags = await Tag.findAll({
    order: [[fn('COUNT', col('tag')), 'DESC']],
    attributes: ['tag', [fn('COUNT', col('tag')), 'count']],
    include: [{ model: Event, where: { is_visible: true }, attributes: [], through: { attributes: [] }, required: true }],
    group: ['tag'],
    raw: true
  })

  return tags
})