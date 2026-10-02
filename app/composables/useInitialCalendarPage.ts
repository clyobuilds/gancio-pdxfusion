// Force the calendar to always start on the current date, and let
// the current date be the same on server and client to avoid hydration errors.
// The calendar tries to go to the first event and breaks when it's not the current month.
export default function useInitialCalendarPage() {
  return useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })
}
