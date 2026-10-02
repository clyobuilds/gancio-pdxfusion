import { Op, col, where, fn, type CreationAttributes } from '@sequelize/core'
import { useLogger } from '../lib/logger'
import { Place, Event } from './db'
const log = useLogger('federation:places')

export async function findOrCreatePlace(body: CreationAttributes<Place> | { id?: number }) {
  if (body?.id != null) {
    const place = await Place.findByPk(body.id)
    if (!place) {
      throw new Error('Place not found')
    }
    return place
  }

  if (body?.ap_id) {
    const place = await Place.findOne({ where: { ap_id: body.ap_id } })
    if (place) {
      return place
    }
  }

  const name = body.name.trim()
  const address = body.address && body.address.trim()
  if (!name || (!address && name?.toLocaleLowerCase() !== 'online')) {
    throw new Error('id or name and address are required')
  }

  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  let place = await Place.findOne({ where: where(fn('LOWER', col('name')), Op.eq, name.toLocaleLowerCase()) })
  if (!place) {
    place = await Place.create({
      name: name,
      address: address || '',
      ...(body.ap_id && { ap_id: body.ap_id }),
      ...(!isNaN(latitude) && !isNaN(longitude) && { latitude, longitude })
    }).catch((e) => {
      console.error(e)
      console.error(e?.errors)
      return
    })
  }
  if (!place) return
  return place
}

export async function cleanOrphanPlaces() {
  const places = await Place.findAll({
    include: [{ model: Event, as: 'events', required: false, attributes: [] }],
    group: ['Place.id'],
    having: where(fn('COUNT', col('events.id')), Op.eq, 0)
  })
  if (!places.length) {
    return
  }
  log.debug(`Remove ${places.length} unrelated places: %s`, places.map(p => p.name).join(', '))

  const ids = places.map(p => p.id)
  return Place.destroy({
    where: { id: { [Op.in]: ids } }
  })
}

export function placeToJSON(place?: Place) {
  if (!place) return undefined
  const eventCount = Number(place?.get('eventCount') ?? place?.eventCount)
  return {
    id: place.id,
    address: place.address, // : addressToString(place.address),
    name: place.name,
    ...(!isNaN(eventCount) && { eventCount }),
    ...(place.ap_id && { ap_id: place.ap_id }),
    ...(place.latitude && place.longitude && { latitude: place.latitude, longitude: place.longitude })
  }
}
