import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { Place } from '~~/server/services'
import { useLogger } from '~~/server/lib/logger'
import { requireAdmin } from '~~/server/lib/auth'

/**
 * Update a place or merge it with another one.
 * @auth
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const log = useLogger('Update place')
  const id = getRouterParam(evt, 'id')
  const body = await readBody(evt)
  const place = await Place.findByPk(id)
  if (!place) {
    log.warn(`Place not found: ${id}`)
    throw createError({ statusCode: 404 })
  }

  // different ids, merge
  if (Number(body.id) !== place.id) {
    const newPlace = await Place.findByPk(body.id)
    if (!newPlace) {
      log.warn(`Place not found ${body.id}`)
      throw createError({ statusCode: 404 })
    }
    log.info(`Merging place ${newPlace.name} with ${place.name}`)
    // - search for events with old place
    const events = await place.getEvents()
    // - substitute it with the new one
    await place.removeEvents(events)
    await newPlace.addEvents(events)

    return place.destroy()

    // TODO:
    // const filters = await Filter.findAll({ where: { places: { [Op.not]: null } } })
    // filters.
  } else {
    return place.update(body)
  }
})
