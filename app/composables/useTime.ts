import { DateTime } from 'luxon'

/**
 * this composable provides time-related utilities aware of instance timezone and locale
 */
export function useTime() {
  const settings = useState<Settings>('settings')
  const { locale, t } = useI18n()

  // datetime helper to create a datetime from seconds, from ISO string or from a Date object
  // with correct locale and timezone
  function dt(input?: number | string | Date) {
    let date: DateTime
    if (typeof input === 'number') {
      date = DateTime.fromSeconds(input)
    } else if (typeof input === 'string') {
      date = DateTime.fromISO(input)
    } else if (input instanceof Date) {
      date = DateTime.fromJSDate(input)
    } else {
      date = DateTime.local()
    }
    return date
      .setZone(settings.value.instance_timezone)
      .setLocale(locale.value || settings.value.instance_locale)
  }

  // get the year (2026)
  function currentYear() {
    return dt().year
  }

  // get the month (1-12)
  function currentMonth() {
    return dt().month
  }

  // get the start of the month (Unix timestamp)
  function startMonth(year?: number, month?: number) {
    const date = year && month ? dt().set({ year, month }) : dt()
    return date.startOf('month').toUnixInteger()
  }

  function nowUnix() {
    return dt().toUnixInteger()
  }

  function time(datetime: number) {
    return dt(datetime).toString()
  }

  function unixFormat(timestamp: number, format = 'EEEE d MMMM HH:mm') {
    return dt(timestamp).toFormat(format)
  }

  function format(date: string, formatStr = 'EEEE d MMMM HH:mm') {
    return dt(date).toFormat(formatStr)
  }

  // get the relative time from a timestamp (e.g. "3 days ago")
  function from(timestamp: number) {
    return dt(timestamp).toRelative()
  }

  function fromDateAndTime(dateObj: Date, timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return dt(dateObj)
      .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 }).toUnixInteger()
  }

  // an event is multi-day when it ends on another day AND lasts a day or more:
  // a dance from 9 PM to 1 AM is a single evening, not a multi-day event
  function isMultiDate(start: number, end?: number) {
    return !!end && !dt(end).hasSame(dt(start), 'day') && end - start >= 24 * 60 * 60
  }

  function when(event: EventAPI) {
    const cy = currentYear()
    const addTimezone = event?.ap_id || event?.place?.name === 'online'

    const start = dt(event?.start_datetime ?? 0)
    let timeStr = start.toLocaleString({
      weekday: 'long',
      ...(cy !== start.year && { year: 'numeric' }),
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      ...(addTimezone && { timeZoneName: 'short' })
    })

    if (event?.end_datetime && event.displayEndTime !== false) {
      const end = dt(event.end_datetime)
      if (isMultiDate(event.start_datetime, event.end_datetime)) {
        timeStr += ` → ${end.toLocaleString({
          weekday: 'long',
          ...(cy !== end.year && { year: 'numeric' }),
          month: 'short',
          day: '2-digit'
        })}`
      } else if (end.diff(start, 'minutes').minutes > 0) {
        timeStr += `-${end.toLocaleString({ hour: 'numeric', minute: '2-digit' })}`
      }
    }

    return timeStr
  }

  // returns the recurrent detail for an event ("every Monday" or "every 2nd day of the month")
  function recurrentDetail (event: EventAPI, format = 'EEEE') {
    const parent = event.parent
    if (!parent || !parent.recurrent || !parent.recurrent.frequency || !parent.start_datetime) return 'error!'
    const { frequency, type } = parent.recurrent
    let recurrent
    if (frequency === '1w' || frequency === '2w') {
      recurrent = t(`event.recurrent_${frequency}_days`, { days: unixFormat(parent.start_datetime, format) })
    } else if (frequency === '1m' || frequency === '2m') {
      const d = type === 'ordinal' ? dt(parent.start_datetime).day : unixFormat(parent.start_datetime, format)
      if (type === 'ordinal') {
        recurrent = t(`event.recurrent_${frequency}_days`, { days: d })
      } else {
        recurrent = t(`event.recurrent_${frequency}_ordinal`, { n: t('ordinal.' + type), days: d })
      }
    }
    if (recurrent && parent.recurrent.until) {
      recurrent += ' ' + t('event.recurrent_until_date', { date: unixFormat(parent.recurrent.until, 'DDD') })
    }
    return recurrent
  }

  return {
    currentYear,
    currentMonth,
    startMonth,
    nowUnix,
    time,
    unixFormat,
    format,
    from,
    when,
    fromDateAndTime,
    isMultiDate,
    recurrentDetail
  }
}

// recurrentDetail (event, format='EEEE') {
//   const opt = {
//     zone,
//     locale: app.i18n.locale || store.state.settings.instance_locale
//   }
//   const parent = event.parent
//   if (!parent.recurrent || !parent.recurrent.frequency) return 'error!'
//   const { frequency, type } = parent.recurrent
//   let recurrent
//   if (frequency === '1w' || frequency === '2w') {
//     recurrent = app.i18n.t(`event.recurrent_${frequency}_days`, { days: DateTime.fromSeconds(parent.start_datetime, opt).toFormat(format)})
//   } else if (frequency === '1m' || frequency === '2m') {
//     const d = type === 'ordinal' ? DateTime.fromSeconds(parent.start_datetime, opt).day : DateTime.fromSeconds(parent.start_datetime, opt).toFormat(format)
//     if (type === 'ordinal') {
//       recurrent = app.i18n.t(`event.recurrent_${frequency}_days`, { days: d })
//     } else {
//       recurrent = app.i18n.t(`event.recurrent_${frequency}_ordinal`,
//       { n: app.i18n.t('ordinal.' + type), days: d })
//     }
//   }
//   return recurrent
// },
