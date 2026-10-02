<script setup lang="ts">
const settings = useState<Settings>('settings')

const route = useRoute()
const tagName = route.params.tag as string
const { showRecurrent } = useShowRecurrent()
const { data, error } = await useFetch<Tag>(`/api/events/tag/${encodeURIComponent(tagName)}`, { query: { show_recurrent: showRecurrent } })

if (!data.value || error.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 500,
    statusMessage: error.value?.statusMessage ?? 'Fetch Error'
  })
}

useHead(() => {
  const title = `${settings.value.title} - ${tagName}`
  return {
    title,
    link: [
      { rel: 'alternate', type: 'application/rss+xml', title, href: settings.value.baseurl + `/feed/rss/tag/${tagName}` },
      { rel: 'alternate', type: 'text/calendar', title, href: settings.value.baseurl + `/feed/ics/tag/${tagName}` }
    ]
  }
})

</script>
<template>
<v-container
  id='home'
  class='px-2 px-sm-6 pt-0'
>
  <h1 class='d-block text-h4 font-weight-black text-center text-uppercase mt-10 mx-auto w-100 text-underline'>
    <u>{{ tagName }}</u>
  </h1>

  <!-- Events -->
  <section class='events mt-sm-4 mt-2'>
    <v-lazy
      v-for='(event, idx) in data.events'
      :key='event.id'
      class='event'
      :model-value='idx<9'
      :options="{ threshold: .5, rootMargin: '500px' }"
    >
      <!-- :class="{ 'theme--dark': is_dark }"> -->
      <EventCard
        :event='event'
        :lazy='idx>9'
        :hide-thumbs="settings.hide_thumbs"
      />
    </v-lazy>
  </section>

  <!-- Old Events -->
  <h2
    v-if="data.pastEvents.length"
    class='mt-14 mb-3'
  >{{$t('common.past_events')}}</h2>
  <section class='events mt-sm-4 mt-2'>
    <v-lazy
      v-for='(event, idx) in data.pastEvents'
      :key='event.id'
      class='event'
      :model-value='idx<9'
      :options="{ threshold: .5, rootMargin: '500px' }"
    >
      <!-- :class="{ 'theme--dark': is_dark }"> -->
      <EventCard
        :event='event'
        :lazy='idx>9'
        :hide-thumbs="settings.hide_thumbs"
      />
    </v-lazy>
  </section>
</v-container>
</template>
