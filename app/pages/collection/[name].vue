<script setup lang="ts">
const route = useRoute()
const settings = useState<Settings>('settings')

useHead({
  title: computed(() => `${settings.value?.title} - ${route.params.name}`),
  meta: [
    { property: 'og:title', content: settings.value.title },
    { property: 'og:url', content: settings.value.baseurl },
    { property: 'og:image', content: settings.value.baseurl + '/logo.png' }
  ],
  link: [
    { rel: 'alternate', type: 'application/rss+xml', title: settings.value.title, href: settings.value.baseurl + '/feed/rss?collection=' + route.params.name },
    { rel: 'alternate', type: 'text/calendar', title: settings.value.title, href: settings.value.baseurl + '/feed/ics?collection=' + route.params.name }
  ]
})

const { data: events } = await useFetch<Event[]>(`/api/collections/${encodeURIComponent(route.params.name)}`)

</script>
<template>
<v-container id='home' class='px-2 px-sm-6 pt-0' fluid>

  <h1 class='d-block text-h3 font-weight-black text-center text-uppercase mt-10 mb-16 mx-auto w-100 text-underline'><u>{{route.params.name}}</u></h1>

  <!-- Events -->
  <div class="mb-2 events">
    <v-lazy
      v-for='(event, idx) in events'
      :key='event.id'
      class='event v-card'
      :model-value='idx<9'
      :options="{ threshold: .5, rootMargin: '500px' }"
    >
      <EventCard :event='event' :lazy='idx>9' :hide-thumbs="settings.hide_thumbs" />
    </v-lazy>
  </div>
</v-container>
</template>
