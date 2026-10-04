import { DateTime, type WeekdayNumbers } from 'luxon'
import { useLogger } from '~~/server/lib/logger'
import { Event, Tag } from '~~/server/services/db'
import { notifyEvent } from '~~/server/services/notifier'
import { publicSettings, secretSettings, setSetting } from '~~/server/services/settings'
import { Op } from '@sequelize/core'
import { RECURRENT_HORIZON_MONTHS } from '../../shared/utils/recurrentHorizon'

const log = useLogger('recurrent')

// how far in the future occurrences of recurrent events are created
export const RECURRENT_HORIZON = { months: RECURRENT_HORIZON_MONTHS }

// an occurrence is notified (e.g. to the fediverse) when it starts within this time,
// to avoid sending all the occurrences of a recurrent event at once
export const RECURRENT_NOTIFY_WINDOW = { days: 7 }

// safety limit on the occurrences created for an event in a single run
const MAX_OCCURRENCES = 200

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
  cursor = cursor.set({ hour: date.hour, minute: date.minute, second: 0, millisecond: 0 })
  log.debug(cursor)
  return cursor
}

/**
 * Return when the first occurrence of a recurrent event starting at `from` or later is.
 *
 * Occurrences are anchored to the start of the recurrent event and calculated in the
 * instance timezone, so they keep their local time across daylight saving time changes
 * and their weekday does not depend on the timezone of the server.
 */
export function nextOccurrence(e: Pick<Event, 'start_datetime' | 'recurrent'>, from: DateTime = DateTime.now()) {
  const zone = publicSettings.instance_timezone
  const start = DateTime.fromSeconds(e.start_datetime, { zone })
  const frequency = e.recurrent?.frequency
  const type = e.recurrent?.type
  from = from.setZone(zone)
  if (!frequency || !start.isValid || !from.isValid) return

  // the recurrent event itself is the first occurrence
  if (from <= start) return start

  const n = Number(frequency[0])
  const unit = frequency[1]

  // each n weeks
  if (unit === 'w') {
    const weeks = Math.floor(from.diff(start, 'weeks').weeks / n) * n
    let cursor = start.plus({ weeks })
    while (cursor < from) {
      cursor = cursor.plus({ weeks: n })
    }
    return cursor
  }

  // each n months or years
  const months = unit === 'y' ? n * 12 : n
  const firstMonth = start.startOf('month')
  const occurrenceAt = (k: number) => {
    const month = firstMonth.plus({ months: k * months }).set({ hour: start.hour, minute: start.minute })
    if (!type || type === 'ordinal') {
      // same day of the month (or its last day, for shorter months)
      return month.set({ day: Math.min(start.day, month.daysInMonth ?? start.day) })
    }
    // nth weekday of the month
    return getWeekdayN(month, Number(type), start.weekday)
  }

  let k = Math.max(0, Math.floor(from.diff(firstMonth, 'months').months / months))
  let cursor = occurrenceAt(k)
  while (cursor < from) {
    cursor = occurrenceAt(++k)
  }
  return cursor
}

// is this occurrence after the end of the recurrence?
function isOver(e: Pick<Event, 'recurrent'>, occurrence: DateTime) {
  return !!e.recurrent?.until && occurrence.toUnixInteger() > e.recurrent.until
}

// the day (in the instance timezone) an event starts
function startDay(start_datetime: number) {
  return DateTime.fromSeconds(start_datetime, { zone: publicSettings.instance_timezone }).toISODate()
}

// occurrences starting before this time have to be notified as soon as they are created,
// the following ones are notified later by `notifyUpcomingOccurrences`
function notifiedUntil() {
  return secretSettings.recurrent_notified_until ?? DateTime.now().plus(RECURRENT_NOTIFY_WINDOW).toUnixInteger()
}

async function createOccurrenceAt(e: Event, start: DateTime) {
  // prepare the new event occurrence copying the parent's properties
  const start_datetime = start.toUnixInteger()
  const duration = e.end_datetime ? e.end_datetime - e.start_datetime : 0
  const event: Partial<Event> = {
    parentId: e.id,
    title: e.title,
    description: e.description,
    media: e.media,
    is_visible: true,
    userId: e.userId,
    placeId: e.placeId,
    ...(e.online_locations && { online_locations: e.online_locations }),
    ...(e.cost && { cost: e.cost }),
    start_datetime,
    end_datetime: e.end_datetime ? start_datetime + duration : undefined
  }

  try {
    const newEvent = await Event.create(event as Event)
    // create/assign tags
    if (e.tags) {
      await newEvent.setTags(e.tags)
    }

    // send notifications
    if (start_datetime <= notifiedUntil()) {
      await notifyEvent('Create', newEvent.id)
    }

    return newEvent
  } catch (e) {
    console.error(event)
    log.error('[RECURRENT EVENT]', e)
  }
}

/**
  * Create the next occurrence of a recurrent event
  */
export async function createRecurrentOccurrence(e: Event, startAt = DateTime.now()) {
  if (!e.recurrent) return
  log.debug(`Create recurrent event [${e.id}] ${e.title} - ${e.recurrent}"`)

  if (!e.recurrent.frequency) {
    log.warn(`Recurrent event ${e.id} - ${e.title} does not have a frequency specified`)
    return
  }

  const start = nextOccurrence(e, startAt)
  if (!start?.isValid || isOver(e, start)) return
  return createOccurrenceAt(e, start)
}

/**
 * Ensure a recurrent event has all its occurrences from `from` up to the horizon
 * (or to its end, when it has one), and at least a visible one in any case (e.g. for yearly events).
 * Existing occurrences are left untouched, including the hidden (skipped) ones.
 */
async function createOccurrences(e: Event, from: DateTime) {
  const horizon = from.plus(RECURRENT_HORIZON)
  const children = e.children ?? []
  // an occurrence moved to another time of the same day still takes its place
  const days = new Set(children.map(c => startDay(c.start_datetime)))
  let hasVisible = children.some(c => c.is_visible)

  let cursor = nextOccurrence(e, from)
  for (let i = 0; i < MAX_OCCURRENCES && cursor?.isValid && !isOver(e, cursor) && (cursor <= horizon || !hasVisible); i++) {
    if (!days.has(cursor.toISODate())) {
      const occurrence = await createOccurrenceAt(e, cursor)
      if (!occurrence) return
      hasVisible = true
    }
    cursor = nextOccurrence(e, cursor.plus({ seconds: 1 }))
  }
}

/**
 * Notify the occurrences entering the notify window since the last run
 */
async function notifyUpcomingOccurrences(now: DateTime) {
  const until = now.plus(RECURRENT_NOTIFY_WINDOW).toUnixInteger()
  const from = secretSettings.recurrent_notified_until

  // nothing to notify on first run: what is already there has been notified at creation
  if (from != null && from < until) {
    const occurrences = await Event.findAll({
      attributes: ['id'],
      where: {
        is_visible: true,
        parentId: { [Op.not]: null },
        start_datetime: { [Op.gt]: Math.max(from, now.toUnixInteger()), [Op.lte]: until }
      }
    })
    for (const occurrence of occurrences) {
      await notifyEvent('Create', occurrence.id)
    }
  }

  if (from == null || from < until) {
    await setSetting('recurrent_notified_until', until, true)
  }
}

// runs are serialized, so that concurrent calls cannot create the same occurrence twice
let running: Promise<void> = Promise.resolve()

/**
  * Create instances of recurrent events
  */
export function createRecurrent(start_datetime?: number) {
  running = running.catch(() => {}).then(() => _createRecurrent(start_datetime))
  return running
}

async function _createRecurrent(start_datetime = DateTime.now().toUnixInteger()) {
  const now = DateTime.fromSeconds(start_datetime)

  // select recurrent events and its children
  const events = await Event.findAll({
    where: { is_visible: true, recurrent: { [Op.isNot]: null } },
    include: [{ model: Tag, required: false },
      { model: Event, as: 'children', required: false, where: { start_datetime: { [Op.gte]: start_datetime } } }]
  })

  // create the missing occurrences of each recurring event
  for (const e of events) {
    await createOccurrences(e, now)
  }

  await notifyUpcomingOccurrences(now)
}

/**
 * Remove the upcoming occurrences of a recurrent event:
 * all of them when the event is removed, only the visible ones when it is modified
 * (so that they get created again with its new details, but the skipped ones stay skipped)
 */
export async function removeUpcomingOccurrences(e: Event, onlyVisible = false) {
  return Event.destroy({
    where: {
      parentId: e.id,
      start_datetime: { [Op.gte]: DateTime.now().toUnixInteger() },
      ...(onlyVisible && { is_visible: true })
    }
  })
}
