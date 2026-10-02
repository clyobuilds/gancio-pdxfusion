/**
 * FrontEnd helpers utilities
 */

import { DateTime } from 'luxon'
import type { FetchError } from 'ofetch'

export function mediaURL(event: EventAPI, type?: string, format = '.jpg') {
  const settings = useState<Settings>('settings')
  const mediaPath = type === 'download' ? '/download/' : '/media/'
  if (event.media && event.media.length) {
    if (type === 'alt') {
      return event?.media?.[0]?.name
    } else {
      return settings?.value?.baseurl + mediaPath + (type === 'thumb' ? 'thumb/' : '') + event?.media?.[0]?.url?.replace(/.jpg$/, format)
    }
  } else if (type !== 'alt') {
    return settings?.value?.baseurl + mediaPath + (type === 'thumb' ? 'thumb/' : '') + 'logo.svg'
  }
  return ''
}

export function manageSetting<K extends keyof Settings>(key: K, setCb?: (value: unknown) => void) {
  const settings = useState<Settings>('settings')
  return computed<Settings[K]>({
    get: () => settings.value[key],
    set: (value) => {
      $fetch('/api/settings', { method: 'PUT', body: { key, value } })
      if (typeof setCb === 'function') {
        setCb(value)
      }
      settings.value[key] = value
    }
  })
}

/**
 * This is a generic formatter to use especially in templates
 */
export const format = {
  /** Actor formatter, used in Admin > Collections > Filter > Instance autocomplete */
  actor(actor: APUser, context = 'label') {
    const settings = useState<Settings>('settings')
    if (context === 'title') {
      if (actor?.ap_id) {
        return actor?.object?.name
      } else {
        return 'Local Instance'
      }
    } else if (context === 'label' || context === 'filter') {
      if (actor?.ap_id) {
        return `@${actor?.object?.preferredUsername ?? actor?.name}@${actor?.instanceDomain ?? actor?.domain}`
      } else {
        return `@${settings.value?.instance_name}@${settings.value?.hostname}`
      }
    } else if (context === 'icon') {
      if (actor?.ap_id) {
        return actor?.object?.icon?.url ?? `${actor?.instanceDomain ?? actor?.domain ?? ''}/favicon.ico`
      } else {
        return settings.value.baseurl + '/logo.png'
      }
    }
  }
}

/**
  * @description build v-calendar attributes
  * @link https://vcalendar.io/calendar/attributes.html#attributes
  */
export function useAttributesFromEvents(events: EventAPI[]) {
  if (!events) return []
  const attributes = []
  // const opt = {
  //   zone: 'Europe/Rome', //publicSettings.instance_timezone,
  //   locale: 'it', //i18n.locale || publicSettings.instance_locale || 'en'
  // }
  const now = DateTime.local().toUnixInteger()
  for (const e of events) {
    const tmp = DateTime.fromSeconds(e?.start_datetime)
    if (!tmp || !tmp.year) continue
    const start = DateTime.local().set({ year: tmp.year, month: tmp.month, day: tmp.day })
    // merge events with same date
    const key = `${start.month}${start.day}`
    const c = (e.end_datetime || e.start_datetime) < now ? 'vc-past' : ''

    if (e?.multidate === true && e.end_datetime) {
      attributes.push({
        dates: { start: start.toJSDate(), end: DateTime.fromSeconds(e.end_datetime).toJSDate() },
        highlight: {
          start: { fillMode: 'outline' },
          base: { fillMode: 'light' },
          end: { fillMode: 'outline' }
        }
      })
      continue
    }

    const i = attributes.find(a => a.day === key)
    if (!i) {
      attributes.push({
        day: key,
        key: e.id, n: 1,
        dates: start.toJSDate(),
        dot: { color: 'teal', class: c }
      })
      continue
    }

    i.n++
    if (i.n >= 20) {
      i.dot = { color: 'purple', class: c }
    } else if (i.n >= 10) {
      i.dot = { color: 'red', class: c }
    } else if (i.n >= 5) {
      i.dot = { color: 'orange', class: c }
    } else if (i.n >= 3) {
      i.dot = { color: 'yellow', class: c }
    } else {
      i.dot = { color: 'teal', class: c }
    }
  }
  // add a bar to highlight today
  attributes.push({ key: 'today', dates: new Date(), highlight: { fillMode: 'outline' } })

  return attributes
}

export function getFetchError(e: FetchError) {
  return e?.data?.statusMessage ?? e?.statusMessage ?? e?.statusText ?? String(e)
}