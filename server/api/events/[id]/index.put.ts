import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { parseMultipartFormData } from '~~/server/lib/parseMultipartForm'
import { mapEvent } from '~~/server/services'
import { upsertEvent } from '~~/server/services/events'
import { getUser } from '~~/server/lib/getUser'

// TODO: flood protection
// TODO: Multiple images upload

/**
 * @openapi
 * /api/events/{id}:
 *   put:
 *     summary: Update event
 *     description: Update an event by id. `Content-Type` has to be `multipart/form-data` to support image upload.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the event to update.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
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
 *               image_url:
 *                 type: string
 *                 required: false
 *                 description: Image URL.
 *     responses:
 *       200:
 *         description: Updated event.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventAPI'
 *       400:
 *         description: Validation error.
 *       403:
 *         description: Not authorized user to modify this event.
 *       404:
 *         description: Event not found.
 *       500:
 *         description: Cannot update event.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const id = Number(getRouterParam(evt, 'id'))
  const user = await getUser(evt)
  const multiPartBody = await parseMultipartFormData(evt)
  const jsonBody = await readBody(evt)

  const payload = multiPartBody || jsonBody
  payload.id = id
  const { event, place, tags } = await upsertEvent(payload, user)
  return mapEvent(event, { user, place, tags })
})
