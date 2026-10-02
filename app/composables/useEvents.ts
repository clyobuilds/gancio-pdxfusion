export const useEvents = () => {
  const time = useTime()
  const { showRecurrent } = useShowRecurrent()
  const route = useRoute()
  const params = useState<Record<string, unknown>>('params', () => ({
    show_recurrent: showRecurrent.value,
    start: time.startMonth(time.currentYear(), time.currentMonth()),
    query: route.query?.query
  }))

  const { data: events, pending, refresh } = useFetch('/api/events', { query: params, dedupe: 'defer' })

  const attributes = computed(() => useAttributesFromEvents(events?.value ?? []))

  return { params, events, attributes, refresh, pending }
}
