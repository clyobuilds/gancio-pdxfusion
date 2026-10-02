import { defineEventHandler, readBody, createError } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { parseIcsData } from '~~/server/services/icsparser'

/**
 * @openapi
 * /api/ics-import:
 *   post:
 *     summary: Get events
 *     description: Convert ICS data to event objects.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               icsText:
 *                 type: string
 *                 description: ICS data.
 *                 example: |
 *                   BEGIN:VCALENDAR
 *                   VERSION:2.0
 *                   PRODID:-//Example Corp//Example Calendar//EN
 *                   BEGIN:VEVENT
 *                   UID:12345@example.com
 *                   DTSTAMP:20260122T120000Z
 *                   DTSTART:20260125T140000Z
 *                   SUMMARY:Team Meeting
 *                   END:VEVENT
 *                   END:VCALENDAR
 *               includePastEvents:
 *                 type: boolean
 *                 description: Include past events or not.
 *                 example: false
 *     responses:
 *       200:
 *         description: Event objects.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *       400:
 *         description: No ICS text received.
 *       500:
 *         description: Error while parsing ICS text.
 *     tags:
 *       - ICS
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('ics')
  const { icsText, includePastEvents = false } = await readBody(event)

  if (!icsText) {
    log.warn('No ICS text received')
    throw createError({ status: 400, message: 'No ICS text received' })
  }

  try {
    const events = parseIcsData(icsText, includePastEvents)
    log.info(`Found ${events.length} event(s)`)
    return { success: true, events }
  } catch (e) {
    log.error('ICS error', e)
    throw createError({ status: 500, message: 'Error while parsing ics text' })
  }
})