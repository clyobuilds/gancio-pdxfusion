import { defineEventHandler, readBody, createError } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { parseIcsData } from '~~/server/services/icsparser'

/**
 * @openapi
 * /api/ics-import/url:
 *   post:
 *     summary: Get events from URL
 *     description: Convert ICS data from URL to event objects.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL with ICS data.
 *                 example: https://example.org/calendar.ics
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
 *         description: No URL provided.
 *       500:
 *         description: Error while fetching or parsing ICS text.
 *     tags:
 *       - ICS
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('ics')
  const { url, includePastEvents = false } = await readBody(event)

  if (!url) {
    log.warn('No URL provided')
    throw createError({ status: 400, message: 'No URL provided' })
  }

  try {
    const icsText = await fetch(url).then(res => res.text())
    const events = parseIcsData(icsText, includePastEvents)
    log.info(`Found ${events.length} event(s)`)
    return { success: true, events }
  } catch (e) {
    log.error('ICS URL error', e)
    throw createError({ status: 500, message: 'Error while fetching or parsing ics text' })
  }
})