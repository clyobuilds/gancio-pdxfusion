// Going "home" (the site title, the Home link) behaves like a refresh of the home page: the selected day, the search and
// the month being browsed are forgotten, so all events are listed again.
export function useGoHome() {
  const route = useRoute()
  const selectedDate = useState<Date | null | undefined>('selectedDate')
  return async (e?: Event) => {
    selectedDate.value = null
    if (route.name === 'index') {
      // already on the home page: reload it, as the browser's refresh button would
      e?.preventDefault()
      await reloadNuxtApp({ path: '/', persistState: false })
    } else {
      // coming from another page: the list and calendar start again from the current month
      const time = useTime()
      const params = useState<Record<string, unknown>>('params')
      if (params.value) {
        params.value.query = undefined
        params.value.start = time.startMonth(time.currentYear(), time.currentMonth())
      }
    }
  }
}
