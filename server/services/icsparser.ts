import ical from 'ical.js'
import { useLogger } from '../lib/logger'
import type { EventStatus } from './db'
import type { EventStatus as IcsEventStatus } from 'ics'

const statusMap: Record<IcsEventStatus, EventStatus> = {
  CANCELLED: 'EventCancelled',
  TENTATIVE: 'EventTentative',
  CONFIRMED: 'EventScheduled'
}

export function parseIcsData(icsText: string, includePastEvents = true) {
  const log = useLogger('ICS Parser')
  const ret = ical.parse(icsText)
  const component = new ical.Component(ret)
  const events = component.getAllSubcomponents('vevent')

  // TODO: Handle received not ics Text

  log.debug(`Found ${events.length} event(s)`)

  const now = Math.floor(Date.now() / 1000)

  return events
    .map((eventData) => {
      const event = new ical.Event(eventData)
      const start_datetime = event.startDate.toUnixTime()
      const end_datetime = event.endDate.toUnixTime()

      // Time check:
      // Skip event only if it has fully ended in the past.
      // That means: both start_datetime AND end_datetime must be less than 'now'.
      // -> Events that are currently ongoing (start < now && end > now) should still be imported.
      if (!includePastEvents && start_datetime < now && end_datetime < now) {
        return
      }

      // Check if optional organizer is present (RFC 5545:
      // "This property is OPTIONAL and MAY appear in an iCalendar object
      //  that specifies a group-scheduled calendar entity.")
      const organizerProp = event.component.getFirstProperty('organizer')
      const organizer = organizerProp
        ? {
            name: organizerProp.getParameter('cn') || '',
            email: (organizerProp.getFirstValue() as string || '')?.replace(/^mailto:/i, '')
          }
        : undefined

      return {
        title: event.summary || '',
        description: event.description || '',
        organizer, // contains { name, email } or null
        status: statusMap[event?.status ?? 'CONFIRMED'],
        uid: event.uid || '',
        location: event.location || '',
        start_datetime,
        end_datetime,
        modified: event?.lastModified?.toUnixTime() || '',
        is_visible: true
      }
    }).filter(Boolean)
}
