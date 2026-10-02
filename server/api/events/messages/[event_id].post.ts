import { defineEventHandler, createError, readBody } from 'h3'
import { getUser } from '~~/server/lib/getUser'
import { useLogger } from '~~/server/lib/logger'
import { Message, Event, publicSettings, User, notifyAdmins, enqueueMail } from '~~/server/services'
import { canModifyEvent } from '~~/server/services/events'

/**
 * @openapi
 * /api/events/messages/{event_id}:
 *   post:
 *     summary: Create message
 *     description: Create a message for an event.
 *     parameters:
 *       - name: event_id
 *         in: path
 *         description: Id of the event.
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
 *               message:
 *                 type: string
 *                 description: Message text.
 *                 example: Message for the event
 *               is_author_visible:
 *                 type: boolean
 *                 description: Indicates if the author is visible or not.
 *     responses:
 *       200:
 *         description: Event's messages.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       403:
 *         description: Moderation is disabled or no permission to create messages.
 *       404:
 *         description: Event does not exist.
 *       500:
 *         description: Message can not be created or notified.
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const log = useLogger('event:moderation')
  if (!publicSettings.enable_moderation) {
    log.error('Disabled')
    throw createError({ status: 403 })
  }

  const eventId = Number(evt.context.params?.event_id)
  const event = await Event.findByPk(eventId, { include: [{ model: User, required: false }] })
  if (!event) {
    log.warn(`Event does not exists: ${eventId}`)
    throw createError({ statusCode: 404 })
  }

  const body = await readBody(evt)
  const user = await getUser(evt)
  const isMine = user?.id === event.userId
  const isAdminOrEditor = ['admin', 'editor'].includes(user?.role ?? '')

  if (!canModifyEvent(event, user) && !publicSettings.enable_report) {
    log.warn(`Someone not allowed is trying to report an event -> "${event.title}" isMine: ${isMine} `)
    throw createError({ statusCode: 403 })
  }

  const author = isAdminOrEditor ? 'ADMIN' : isMine ? 'AUTHOR' : 'ANON'
  try {
    const message = await Message.create({
      eventId,
      message: body.message,
      is_author_visible: body.is_author_visible || isMine,
      author
    })

    // notify admins
    notifyAdmins('report', { event, message: body.message, author })
    log.info('Report event to admins')

    // notify author
    if (event?.user?.email && body.is_author_visible && !isMine) {
      enqueueMail(event.user.email, 'report', { event, message: body.message, author })
    }

    return message
  } catch (e) {
    log.warn(`[EVENT] ${e}`)
    throw createError({ statusCode: 500 })
  }
})
