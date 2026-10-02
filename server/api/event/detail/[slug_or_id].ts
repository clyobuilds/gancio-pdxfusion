import { defineEventHandler, getRouterParam, createError, setHeader, getQuery } from 'h3'
import { getUser } from '~~/server/lib/getUser'

import { mapEvent } from '~~/server/services'
import { useLogger } from '~~/server/lib/logger'
import { exportICS } from '~~/server/services/ics'
import { canModifyEvent, eventToAP, getEventBySlugOrId } from '~~/server/services/events'
import { enableCors } from '~~/server/lib/API'
import { preferCalendar, preferLDJSON } from '~~/server/lib/negotiator'

/**
 * @openapi
 * /api/event/detail/{slug_or_id}:
 *   get:
 *     summary: Get event details
 *     description: Get event details by id.
 *     parameters:
 *       - name: slug_or_id
 *         in: path
 *         description: Slug or id of the event to get.
 *         required: true
 *         example: 1
 *         schema:
 *           type: string
 *       - name: format
 *         in: query
 *         description: The format of the response (default 'json').
 *         schema:
 *           type: string
 *           enum: [json,json-ld,ics]
 *         example: json
 *     responses:
 *       200:
 *         description: Event details in the requested format (JSON, JSON-LD, or ICS).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventAPI'
 *           application/activity+json:
 *             schema:
 *               $ref: '#/components/schemas/APEvent'
 *           text/calendar:
 *             schema:
 *               type: string
 *               example: |
 *                 BEGIN:VCALENDAR
 *                 VERSION:2.0
 *                 CALSCALE:GREGORIAN
 *                 PRODID:adamgibbons/ics
 *                 METHOD:PUBLISH
 *                 X-PUBLISHED-TTL:PT1H
 *                 BEGIN:VEVENT
 *                 UID:1@localhost
 *                 SUMMARY:Event test
 *                 DTSTAMP:20260702T135146Z
 *                 DTSTART:20260715T100000Z
 *                 DTEND:20260715T160000Z
 *                 DESCRIPTION:Event description
 *                 URL:https://demo.gancio.org/event/event-test
 *                 LOCATION:Location test - Address test
 *                 STATUS:CONFIRMED
 *                 CATEGORIES:testtag
 *                 X-ALT-DESC;FMTTYPE=text/html:<p>Event description</p>
 *                 BEGIN:VALARM
 *                 ACTION:DISPLAY
 *                 DESCRIPTION:Event test
 *                 TRIGGER:-PT1H
 *                 END:VALARM
 *                 END:VEVENT
 *                 END:VCALENDAR
 *       404:
 *         description: Event is not found or not visible to the current user.
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  enableCors(evt)
  const log = useLogger('event details!')
  const user = await getUser(evt)

  const slug_or_id = getRouterParam(evt, 'slug_or_id')
  const event = await getEventBySlugOrId(slug_or_id)
  const format = getQuery(evt)?.format ?? 'json'

  if (!event) {
    log.warn(`Event not found: ${slug_or_id}`)
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  // TODO
  // admin, editors and event's owner gets the number of moderation messages (could open moderation)
  // let n_messages = 0
  // if (isAdminOrEditor || event.userId !== user?.id) {
  //   n_messages = await Message.count({ where: { eventId: event.id, ...(!isAdminOrEditor && { is_author_visible: true }) } }).catch(() => 0)
  // }

  if (!event.is_visible && !canModifyEvent(event, user)) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  if (preferLDJSON(evt) || format === 'json-ld') {
    setHeader(evt, 'Content-Type', 'application/activity+json')
    return eventToAP(event)
  } else if (preferCalendar(evt) || format === 'ics') {
    setHeader(evt, 'Content-Type', 'text/calendar')
    // last arg is alarms/reminder, ref: https://github.com/adamgibbons/ics#attributes (alarms)
    return exportICS(evt, [event], [{
      action: 'display',
      description: event.title,
      trigger: { hours: 1, before: true }
    }])
  }
  return mapEvent(event, { user })
})
