import { defineEventHandler } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
import { fn, col } from '@sequelize/core'
import { Event, Place } from '~~/server/services'
import { placeToJSON } from '~~/server/services/places'

/**
 * List all places with their event count, used in admin panel
 * @auth
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const places = await Place.findAll({
    order: [[fn('COUNT', col('events.placeId')), 'DESC']],
    attributes: ['name', 'address', 'latitude', 'longitude', 'id', 'ap_id',
      [fn('COUNT', col('events.placeId')), 'eventCount']],
    include: [{ model: Event, where: { is_visible: true }, required: true, attributes: [] }],
    group: ['Place.id']
  })
  // return places
  return places.map(placeToJSON)
})
