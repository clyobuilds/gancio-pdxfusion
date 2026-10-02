import { DateTime } from 'luxon'

export default function useIsSearchingCalendar(): ComputedRef<boolean> {
  const { params } = useEvents()
  const selectedDate = useState('selectedDate')
  const thisMonth = DateTime.local().startOf('month')
  return computed(() => {
    const queryDate = DateTime.fromSeconds(params.value.start as number)
    const isSameMonth = queryDate.diff(thisMonth, 'months').months === 0
    return selectedDate.value != null || !isSameMonth
  })
}
