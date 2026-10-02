function formatDatetime(timestamp, type = 'long', addTimezone = false) {
  const options =
    type === 'long'
      ? {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          ...(addTimezone && { timeZoneName: 'short' })
        }
      : { hour: '2-digit', minute: '2-digit' }
  return new Date(timestamp * 1000).toLocaleString(undefined, options)
}

export function when(event) {
  const addTimezone = event.ap_id || event.place.name === 'online'
  if (event.multidate) {
    return formatDatetime(event.start_datetime, 'long', addTimezone) + ' - ' +
      formatDatetime(event.end_datetime, 'long', addTimezone)
  }
  return (
    formatDatetime(event.start_datetime, 'long', addTimezone)
  )
}

/**
 * Converts html attributes to boolean values.
 */
export function toBoolean(value) {
  if (value === '' || value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'string') {
    return value !== 'false'
  }
  return Boolean(value)
}
