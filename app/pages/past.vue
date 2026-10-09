<!--
PAST EVENTS
The archive: every event that is over, newest first, a page at a time. Linked from the bottom of the home list.
-->
<script setup lang="ts">
const settings = useState<Settings>('settings')
const time = useTime()
const { t } = useI18n()

const PAGE_SIZE = 60
// "now" when the page is opened: events that started before it and are over are the archive
const now = time.nowUnix()
const query = (page: number) => ({ start: now, older: true, reverse: true, show_recurrent: true, max: PAGE_SIZE, page })

useHead({ title: `${settings.value.title} - ${t('common.past_events')}` })

const { data: first } = await useFetch<EventAPI[]>('/api/events', { query: query(0), key: 'past-events' })
const events = ref<EventAPI[]>([...(first.value ?? [])])
const page = ref(0)
const hasMore = ref((first.value?.length ?? 0) === PAGE_SIZE)
const loading = ref(false)

async function loadMore() {
  loading.value = true
  page.value++
  const next = await $fetch<EventAPI[]>('/api/events', { query: query(page.value) }).catch(() => [] as EventAPI[])
  events.value.push(...next)
  hasMore.value = next.length === PAGE_SIZE
  loading.value = false
}
</script>
<template>
<v-container id='past' class='px-2 px-sm-6 pt-0'>

  <h1 class='d-block text-h4 font-weight-black text-center text-uppercase mt-10 mx-auto w-100 text-underline'>
    <u>{{ $t('common.past_events') }}</u>
  </h1>

  <section class='events mt-sm-4 mt-2'>
    <v-lazy
      v-for='(event, idx) in events'
      :key='event.id'
      class='event'
      :model-value='idx<9'
      :options="{ threshold: .5, rootMargin: '500px' }"
    >
      <EventCard :event='event' :lazy='idx>9' :hide-thumbs="settings.hide_thumbs" />
    </v-lazy>
  </section>

  <div v-if='!events.length' class='d-flex flex-column align-center ga-2 my-8 my-sm-12'>
    <span class='text-h4 text-medium-emphasis'>{{ $t('common.no_events_found') }}</span>
  </div>

  <div v-if='hasMore' class='d-flex justify-center my-6'>
    <v-btn variant='outlined' color='primary' :loading='loading' @click='loadMore'>{{ $t('common.load_more') }}</v-btn>
  </div>

  <div class='d-flex justify-center my-6'>
    <v-btn prepend-icon='mdi-arrow-left' variant='text' to='/'>{{ $t('common.home') }}</v-btn>
  </div>

</v-container>
</template>
