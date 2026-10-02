import { DateTime } from 'luxon'
import ics from 'ics'
import { type H3Event, setHeader, createError } from 'h3'
import type { Event, EventStatus } from './db'
import { htmlToText } from 'html-to-text'
import { publicSettings } from './settings'

/**
 * Send an ics of specified events (optionally with reminders)
 * @param {Event[]} events array of events from sequelize
 * @param {*} alarms https://github.com/adamgibbons/ics#attributes (alarms)
 */
export function exportICS(evt: H3Event, events: Event[], alarms?: ics.Alarm[]) {
  const statusMap: Record<EventStatus, ics.EventStatus> = {
    EventCancelled: 'CANCELLED',
    EventTentative: 'TENTATIVE',
    EventScheduled: 'CONFIRMED',
    EventMovedOnline: 'CONFIRMED',
    EventPostponed: 'TENTATIVE',
    EventRescheduled: 'CONFIRMED'
  }
  const eventsMap = events.map((e) => {
    const tmpStart = DateTime.fromSeconds(e.start_datetime, { zone: 'UTC' })
    const start: [number, number, number, number, number] = [tmpStart.year, tmpStart.month, tmpStart.day, tmpStart.hour, tmpStart.minute]

    const location = e?.place ? (e.place?.name !== 'online' ? `${e.place?.name} - ${e.place?.address}` : `${e.place?.name} - ${e?.online_locations?.[0]}`) : ''
    const ret: ics.EventAttributes = {
      uid: `${e.id}@${publicSettings.hostname}`,
      start,
      startInputType: 'utc',
      endInputType: 'utc',
      title: e.title,
      description: htmlToText(e.description),
      htmlContent: e.description && e.description.replace(/\n/g, '<br>'),
      location,
      url: `${publicSettings.baseurl}/event/${e.slug || e.id}`,
      status: statusMap[e.status],
      categories: e?.tags?.map(t => t.tag || t) as string[],
      created: e.createdAt?.getTime(),
      lastModified: e.updatedAt?.getTime(),
      alarms
    }

    if (e.place?.latitude && e.place?.longitude) {
      ret.geo = { lat: e.place.latitude, lon: e.place.longitude }
    }

    if (e.end_datetime && e.ap_object?.displayEndTime !== false) {
      const tmpEnd = DateTime.fromSeconds(e.end_datetime, { zone: 'UTC' })
      const end = [tmpEnd.year, tmpEnd.month, tmpEnd.day, tmpEnd.hour, tmpEnd.minute]
      ret.end = end
    }

    return ret
  })

  setHeader(evt, 'Content-Type', 'text/calendar; charset=UTF-8')
  return ics.createEvents(eventsMap, (err, value) => {
    if (err) {
      throw createError({ status: 401, message: String(err) })
    }
    return value
  })
}
