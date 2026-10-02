import { defineEventHandler, getRouterParam, createError, setHeader, sendError } from 'h3'
import { PlaceToAP } from '~~/server/federation/places'
import { useLogger } from '~~/server/lib/logger'
import { Place } from '~~/server/services'

export default defineEventHandler(async (event) => {
  // const { preferHTML } = await import('./helpers')
  const log = useLogger('') // Assuming you have a logger composable or utility
  const id = getRouterParam(event, 'id')
  log.debug('[FEDI] Get location')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad request.' })
  }

  // if (preferHTML(event)) {
  //   return sendRedirect(event, `/place/${id}`, 302)
  // }

  const place = await Place.findByPk(id)
  if (!place) {
    log.warn(`[FEDI] Place ${id} not found`)
    return sendError(event, createError({ statusCode: 404, statusMessage: 'Not found.' }))
  }

  const ret = PlaceToAP(place)
  // ret['@context'] = ['https://www.w3.org/ns/activitystreams']
  setHeader(event, 'Content-Type', 'application/activity+json; charset=utf-8')
  return ret
})
