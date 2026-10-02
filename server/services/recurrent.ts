import { DateTime, type WeekdayNumbers } from 'luxon'
import { useLogger } from '~~/server/lib/logger'
import { Event, Tag } from '~~/server/services/db'
import { notifyEvent } from '~~/server/services/notifier'
import { Op } from '@sequelize/core'

const log = useLogger('recurrent')

export function getWeekdayN(date: DateTime, n: number, weekday: WeekdayNumbers) {
  let cursor
  if (n === -1) {
    cursor = date.endOf('month')
    cursor = cursor.set({ weekday })
    if (cursor.month !== date.month) {
      cursor = cursor.minus({ days: 7 })
    }
  } else {
    cursor = date.startOf('month')
    // cursor = cursor.add(cursor.day <= date.day ? n - 1 : n, 'week')
    cursor = cursor.plus({ weeks: cursor.weekday <= weekday ? n - 1 : n })
    cursor = cursor.set({ weekday })
  }
  cursor = cursor.set({ hour: date.hour, minute: date.minute, second: 0 })
  log.debug(cursor)
  return cursor
}

/**
  * Ensure we have the next occurrence of a recurrent event
  */
export async function createRecurrentOccurrence(e: Event, startAt = DateTime.local()) {
  if (!e.recurrent) return
  log.debug(`Create recurrent event [${e.id}] ${e.title} - ${e.recurrent}"`)

  // prepare the new event occurrence copying the parent's properties
  const event: Partial<Event> = {
    parentId: e.id,
    title: e.title,
    description: e.description,
    media: e.media,
    is_visible: true,
    userId: e.userId,
    placeId: e.placeId,
    ...(e.online_locations && { online_locations: e.online_locations })
  }

  const recurrentDetails = e.recurrent
  const parentStartDatetime = DateTime.fromSeconds(e.start_datetime)
  if (!parentStartDatetime.isValid) {
    return
  }
  // cursor is when start to count
  // in case parent is in past, start to calculate from now
  let cursor = parentStartDatetime > startAt ? parentStartDatetime : startAt
  startAt = cursor

  const duration = e.end_datetime ? e.end_datetime - e.start_datetime : 0
  const frequency = recurrentDetails.frequency
  const type = recurrentDetails.type
  if (!frequency) {
    log.warn(`Recurrent event ${e.id} - ${e.title} does not have a frequency specified`)
    return
  }

  cursor = cursor.set({ hour: parentStartDatetime.hour, minute: parentStartDatetime.minute, second: 0 })

  // each week or 2
  if (frequency[1] === 'w') {
    cursor = cursor.set({ weekday: parentStartDatetime.weekday })
    if (cursor < startAt) {
      cursor = cursor.plus({ days: 7 * Number(frequency[0]) })
    }
  } else if (frequency === '1m' || frequency === '1y') {
    const interval = frequency === '1y' ? { years: 1 } : { months: 1 }
    // day n.X each interval
    if (type === 'ordinal') {
      cursor = cursor.set({ day: parentStartDatetime.day })

      if (cursor < startAt) {
        cursor = cursor.plus(interval)
      }
    } else { // weekday
      // get recurrent freq details
      cursor = getWeekdayN(cursor, Number(type), parentStartDatetime.weekday)
      if (cursor < startAt) {
        cursor = cursor.plus(interval)
        cursor = getWeekdayN(cursor, Number(type), parentStartDatetime.weekday)
      }
    }
  }
  event.start_datetime = cursor.toUnixInteger()
  event.end_datetime = e.end_datetime ? event.start_datetime + duration : undefined
  try {
    const newEvent = await Event.create(event as Event)
    // create/assign tags
    if (e.tags) {
      await newEvent.setTags(e.tags)
    }

    // send notifications
    await notifyEvent('Create', newEvent.id)

    return newEvent
  } catch (e) {
    console.error(event)
    log.error('[RECURRENT EVENT]', e)
  }
}

/**
  * Create instances of recurrent events
  */
export async function createRecurrent(start_datetime = DateTime.local().toUnixInteger()) {
  // select recurrent events and its children
  const events = await Event.findAll({
    where: { is_visible: true, recurrent: { [Op.isNot]: null } },
    include: [{ model: Tag, required: false },
      { model: Event, as: 'children', required: false, where: { start_datetime: { [Op.gte]: start_datetime } } }],
    order: [['children', 'start_datetime', 'DESC']]
  })

  // create a new occurrence for each recurring events but the one's that has an already visible occurrence coming
  const creations = events.map((e) => {
    if (e.children?.length) {
      if (e.children.find(c => c.is_visible)) return
      const last = DateTime.fromSeconds(e.children[0]!.start_datetime + 1)
      return createRecurrentOccurrence(e, last.isValid ? last : DateTime.local())
    }
    return createRecurrentOccurrence(e)
  })

  return Promise.all(creations)
}
