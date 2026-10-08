// Has the event ended? (An event without an end time counts as over 3 hours after it starts.)
export function eventIsPast(event: { start_datetime: number, end_datetime?: number | null }, now = Date.now()) {
  const end = event.end_datetime ?? event.start_datetime + 3 * 60 * 60
  return end * 1000 < now
}
