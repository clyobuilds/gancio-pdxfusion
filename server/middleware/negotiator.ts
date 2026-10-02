/**
 * this middleware negotiates the response format for some pages:
 * as an example, asking for a page at https://demo.gancio.org/event/example with Accept: application/ld+json or application/activity+json
 * returns the AP representation of the event
 */
import { defineEventHandler, createRouter } from 'h3'
import eventDetail from '../api/event/detail/[slug_or_id]'
import { preferHTML } from '../lib/negotiator'

const router = createRouter()

// event detail page
router.get('/event/:slug_or_id', eventDetail)

export default defineEventHandler((evt) => {
  // in case the client prefers JSON, check if the request is for the JSON endpoint
  if (preferHTML(evt)) return
  return router.handler(evt)
})