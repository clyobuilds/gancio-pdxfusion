import { defineEventHandler, readBody } from 'h3'
import { getUser } from '~~/server/lib/getUser'
import { parseMultipartFormData } from '~~/server/lib/parseMultipartForm'
import { upsertEvent, mapEvent } from '~~/server/services/events'

// TODO: Multiple images upload

/**
 * @openapi
 * /api/events:
 *   post:
 *     summary: Create event
 *     description: Add a new event. Allow anyone to add an event (anon event has to be confirmed).
 *
 *       `Content-Type` has to be `multipart/form-data` to support image upload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Event's title.
 *                 example: Event title
 *               description:
 *                 type: string
 *                 description: Event's description (html accepted and sanitized).
 *                 example: Event description
 *               place_name:
 *                 type: string
 *                 description: The name of the place.
 *                 example: Place name
 *               place_address:
 *                 type: string
 *                 required: false
 *                 description: The address of the place.
 *                 example: Place address
 *               place_latitude:
 *                 type: string
 *                 required: false
 *                 description: The latitude of the place.
 *                 example: Place latitude
 *               place_longitude:
 *                 type: string
 *                 required: false
 *                 description: The longitude of the place.
 *                 example: Place longitude
 *               online_locations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of online locations.
 *                 example:
 *                   - https://event.online
 *                   - https://eventalt.online
 *               start_datetime:
 *                 type: string
 *                 description: Start timestamp.
 *                 example: 1784109600
 *               multidate:
 *                 type: boolean
 *                 description: Indicates if event is multidate or not.
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of tags.
 *               recurrent:
 *                 $ref: '#/components/schemas/Recurrent'
 *                 description: Recurrent event details.
 *                 required: false
 *               recurrent.frequency:
 *                 type: string
 *                 required: false
 *                 description: Could be `1w` or `2w`.
 *                 example: 1w
 *               recurrent.days:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 required: false
 *                 description: Array of days.
 *                 example:
 *                   - 1
 *                   - 3
 *               image:
 *                 type: string
 *                 format: binary
 *                 required: false
 *                 description: Event image.
 *               is_visible:
 *                 type: boolean
 *                 required: false
 *                 description: Indicates if event is published (visible) or a draft (not visible).
 *               image_url:
 *                 type: string
 *                 required: false
 *                 description: Image URL.
 *     responses:
 *       200:
 *         description: List of events.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventAPI'
 *       400:
 *         description: Validation error.
 *       404:
 *         description: Event not found.
 *       500:
 *         description: Cannot create event.
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const user = await getUser(evt)
  const multiPartBody = await parseMultipartFormData(evt)
  const jsonBody = await readBody(evt)

  const { event, place, tags } = await upsertEvent(multiPartBody || jsonBody, user)
  return mapEvent(event, { user, place, tags })
})
