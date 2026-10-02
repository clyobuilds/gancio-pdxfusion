import { defineEventHandler, getRouterParam, createError, setHeader, sendRedirect } from 'h3'
import { Event, Place, Tag } from '~~/server/services'
import { eventToAP } from '~~/server/services/events'
import { useLogger } from '~~/server/lib/logger'
import { preferHTML } from '~~/server/lib/negotiator'

export default defineEventHandler(async (evt) => {
  const id = Number(getRouterParam(evt, 'id'))
  const log = useLogger('Federation event')
  log.debug('Get event')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad request.' })
  }

  if (preferHTML(evt)) {
    return sendRedirect(evt, `/event/${id}`, 302)
  }

  const event = await Event.findByPk(id, { include: [Place, Tag] })
  if (!event) {
    log.warn(`Event ${id} not found`)
    throw createError({ statusCode: 404 })
  }

  setHeader(evt, 'Content-Type', 'application/activity+json; charset=utf-8')
  return eventToAP(event)
})
