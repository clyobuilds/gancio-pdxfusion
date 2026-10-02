import { defineEventHandler, createError, getRouterParam } from 'h3'
import { Event, Place, Tag } from '~~/server/services'
import { Op, type WhereOptions } from '@sequelize/core'

/**
 * @openapi
 * /api/events/{id}:
 *   get:
 *     summary: Get event
 *     description: Get an event by id.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id of the event to get.
 *         required: true
 *         example: 1
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event with identifier `id`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event does not exist.
 *     tags:
 *       - Events
 */
export default defineEventHandler(async (evt) => {
  const slug = getRouterParam(evt, 'id')
  const id = Number(slug)
  const where: WhereOptions<Event> = {
    [Op.or]: [
      { slug },
      ...(Number.isInteger(id) ? [{ id }] : [])
    ]
  }
  const event = await Event.findOne({ where, include: [Tag, Place] })
  if (event) {
    return event
  } else {
    throw createError({ status: 404, message: 'Not found' })
  }
})