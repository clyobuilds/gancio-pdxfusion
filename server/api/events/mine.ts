import { defineEventHandler } from 'h3'
import { getEvents, mapEvent } from '~~/server/services'
import { requireUser } from '~~/server/lib/auth'

/**
 * @openapi
 * /api/events/mine:
 *   get:
 *     summary: Get current user events
 *     description: Get events created by the current user.
 *     responses:
 *       200:
 *         description: List of events.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventAPI'
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const events = await getEvents({ mine: true, include_unconfirmed: true }, user)
  return events.map(e => mapEvent(e))
})
