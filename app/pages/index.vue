<!--
HOMEPAGE
The homepage shows future events by default.
-->
<script setup lang="ts">
import { DateTime } from 'luxon'

const time = useTime()
// middleware setup!

const settings = useState<Settings>('settings')
useHead({
  title: settings.value?.title,
  meta: [
    { name: 'description', content: settings?.value.description },
    { name: 'og:description', content: settings?.value.description },
    { property: 'og:title', content: settings.value.title },
    { property: 'og:url', content: settings.value.baseurl },
    { property: 'og:image', content: settings.value.baseurl + '/logo.png' }
  ],
  link: [
    { rel: 'apple-touch-icon', href: settings.value.baseurl + '/logo.png' },
    { rel: 'alternate', type: 'application/rss+xml', title: settings.value.title, href: settings.value.baseurl + '/feed/rss' },
    { rel: 'alternate', type: 'text/calendar', title: settings.value.title, href: settings.value.baseurl + '/feed/ics' },
    { rel: 'search', type: 'application/opensearchdescription+xml', title: settings.value.title, href: settings.value.baseurl + '/opensearch.xml' },
    { rel: 'me', href: `${settings.value.baseurl}/federation/u/${settings.value.instance_name}` }
  ]
})

const now = time.nowUnix()

const selectedDate = useState<Date | null | undefined>('selectedDate', () => undefined)
const { events, params, refresh } = useEvents()
onMounted(() => refresh())

// check if current month is selected
const isCurrentMonth = computed(() => params.value.start === time.startMonth())

// tabs: all events, or only one kind (Social / Lesson / Workshop)
const category = useState<string>('category', () => 'all')

const dateFiltered = computed(() => {
  if (params.value.query) {
    return events.value
  }
  if (selectedDate.value) {
    const min = DateTime.fromJSDate(selectedDate?.value)?.startOf('day')?.toUnixInteger()
    const max = DateTime.fromJSDate(selectedDate?.value)?.endOf('day')?.toUnixInteger()
    // an event belongs to the day it starts, even when it runs past midnight; only events lasting a day or more
    // (festivals) also appear on the following days, and ending exactly at midnight does not reach the next day
    return events.value?.filter((e) => {
      const multiDay = e.end_datetime && e.end_datetime - e.start_datetime >= 24 * 3600
      return multiDay
        ? e.start_datetime <= max && e.end_datetime! - 1 >= min
        : e.start_datetime >= min && e.start_datetime <= max
    })
  } else if (isCurrentMonth.value) {
    return events.value?.filter((e) => {
      const end_datetime = e?.end_datetime ?? e.start_datetime + settings.value.open_ended_event_default_duration * 60 * 60
      return end_datetime >= now
    })
  } else {
    return events.value
  }
})

const visibleEvents = computed(() => {
  const inCategory = (list?: EventAPI[]) => category.value === 'all' ? list : list?.filter(e => categoriesOf(e.tags).includes(category.value as typeof EVENT_CATEGORIES[number]))
  return inCategory(dateFiltered.value)
})

// month headings: shown only on the plain list (not searching, nor looking at a single day)
const showMonths = computed(() => !params.value.query && !selectedDate.value)

// an event that already started is listed in the current month, not in the one it started
const monthOf = (event: EventAPI) => Math.max(event.start_datetime, now)
const monthKey = (event: EventAPI) => time.unixFormat(monthOf(event), 'yyyy-MM')
const monthLabel = (event: EventAPI) => {
  const sameYear = time.unixFormat(monthOf(event), 'yyyy') === time.unixFormat(now, 'yyyy')
  return time.unixFormat(monthOf(event), sameYear ? 'LLLL' : 'LLLL yyyy')
}
const startsMonth = (idx: number) => {
  const events = visibleEvents.value ?? []
  return idx === 0 || monthKey(events[idx]!) !== monthKey(events[idx - 1]!)
}

const { data: announcements } = await useFetch<Announcement[]>('/api/announcements')

</script>
<template>
<v-container id='home' class='px-2 px-sm-6 pt-0'>

  <!-- Announcements -->
  <section v-if='announcements?.length' id='announcements' class='mt-2 mt-sm-4'>
    <Announcement v-for='announcement in announcements' :key='announcement.id' :announcement='announcement' />
  </section>

  <!-- Category tabs -->
  <v-tabs v-model='category' id='category-tabs' class='mt-2 mt-sm-4' color='primary' align-tabs='center' grow>
    <v-tab value='all'>{{ $t('common.type_all') }}</v-tab>
    <v-tab v-for='c in EVENT_CATEGORIES' :key='c' :value='c'>{{ $t(`common.type_${c.toLowerCase()}`) }}s</v-tab>
  </v-tabs>

  <!-- Events -->
  <section class='events mt-sm-4 mt-2'>
    <template v-for='(event, idx) in visibleEvents' :key='event.id'>
      <h2 v-if='showMonths && startsMonth(idx)' class='month-heading'>{{ monthLabel(event) }}</h2>
      <v-lazy
        class='event' :model-value='idx<9'
        :options="{ threshold: .5, rootMargin: '500px' }">
        <EventCard :event='event' :lazy='idx>9' :hide-thumbs="settings.hide_thumbs" />
      </v-lazy>
    </template>

    <div v-if="!visibleEvents?.length" class="d-flex flex-column align-center ga-2 my-8 my-sm-12">
      <span class="text-h4 text-medium-emphasis">{{ $t('common.no_events_found') }}</span>
      <span>{{ $t('common.no_events_found_hint') }}</span>
      <v-icon icon="mdi-cactus" :size="200" class="opacity-20 mt-2" />
    </div>
  </section>

</v-container>
</template>

<style>
.month-heading {
  flex: 0 0 100%;
  width: 100%;
  margin: 1rem 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 6px;
}
</style>
