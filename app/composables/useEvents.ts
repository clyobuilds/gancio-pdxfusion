export const useEvents = () => {
  const time = useTime()
  const { showRecurrent } = useShowRecurrent()
  const route = useRoute()
  const params = useState<Record<string, unknown>>('params', () => ({
    show_recurrent: showRecurrent.value,
    start: time.startMonth(time.currentYear(), time.currentMonth()),
    query: route.query?.query
  }))

  // repeating events are shown only up to the horizon: dates created earlier with a longer horizon stay hidden until they are close
  const horizon = () => time.nowUnix() + RECURRENT_HORIZON_MONTHS * 31 * 24 * 3600
  const { data: events, pending, refresh } = useFetch('/api/events', {
    query: params,
    dedupe: 'defer',
    transform: (list: EventAPI[]) => list.filter(e => !e.parentId || e.start_datetime <= horizon())
  })

  const attributes = computed(() => useAttributesFromEvents(events?.value ?? []))

  return { params, events, attributes, refresh, pending }
}
