<script setup lang="ts">
const settings = useState<Settings>('settings')

const route = useRoute()
const { showRecurrent } = useShowRecurrent()
const { data } = await useFetch(`/api/events/place/${route.params.id}`, { query: { show_recurrent: showRecurrent } })
if (!data.value) {
  throw createError({ status: 404, statusMessage: `Place ${route.params?.id} not found` })
}

useHead(() => {
  const title = `${settings.value.title} - ${data.value?.place?.name}`
  return {
    title,
    link: [
      { rel: 'alternate', type: 'application/rss+xml', title, href: settings.value.baseurl + `/feed/rss/place/${data.value?.place.name}` },
      { rel: 'alternate', type: 'text/calendar', title, href: settings.value.baseurl + `/feed/ics/place/${data.value?.place?.name}` }
    ]
  }
})

// venues saved before addresses could be looked up have no coordinates: find them from the address so a map can be drawn
const mapPlace = ref(data.value?.place?.latitude && data.value?.place?.longitude ? data.value.place : null)
onMounted(async () => {
  const place = data.value?.place
  if (mapPlace.value || !settings.value?.allow_geolocation || !place?.address || place.name === 'online') {
    return
  }
  try {
    const found = await $fetch<{ lat: number, lon: number }[]>('/api/geocode', { params: { q: place.address } })
    if (found?.[0]) {
      mapPlace.value = { ...place, latitude: found[0].lat, longitude: found[0].lon }
    }
  } catch {
    // no map for this venue
  }
})
const mapLink = useMapLink(() => mapPlace.value ?? {})
</script>
<template>
<v-container id='home' class='px-2 px-sm-6 pt-0'>
  <h1 class='d-block text-h4 font-weight-black text-center text-uppercase mt-10 mx-auto w-100 text-underline'>
    <u>{{ data.place?.name }}</u>
  </h1>
  <span v-if='data.place?.name!=="online"' class="d-block text-subtitle text-center w-100">{{ data.place?.address }}</span>

  <!-- Map -->
  <div v-if='settings?.allow_geolocation && mapPlace' class="position-relative my-4">
    <Map :place='mapPlace' height="12rem" />
    <!-- tapping the map opens the visitor's own maps app -->
    <a class="map-cover" :href="mapLink" target="_blank" rel="noopener" :aria-label="$t('common.open_in_maps')" />
    <HowToArriveNav :place='mapPlace' />
  </div>

  <!-- Events -->
  <section class='events mt-sm-4 mt-2'>
    <v-lazy
      v-for='(event, idx) in data.events' :key='event.id'
      class='event' :model-value='idx<9'
      :options="{ threshold: .5, rootMargin: '500px' }"
    >
      <!-- :class="{ 'theme--dark': is_dark }"> -->
      <EventCard :event='event' :lazy='idx>9' :hide-thumbs="settings.hide_thumbs" />
    </v-lazy>
  </section>

  <!-- Past Events -->
  <h2 v-if="data?.pastEvents.length" class='mt-14 mb-3'>{{$t('common.past_events')}}</h2>
  <section v-if="data?.pastEvents.length" class="events">
    <v-lazy
      v-for='(event, idx) in data.pastEvents' :key='event.id'
      class='event' :model-value='idx<9'
      :options="{ threshold: .5, rootMargin: '500px' }">
      <!-- :class="{ 'theme--dark': is_dark }"> -->
      <EventCard :event='event' :lazy='idx>9' :hide-thumbs="settings.hide_thumbs" />
    </v-lazy>
  </section>

</v-container>
</template>

<style>
.map-cover {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: 8px;
}
</style>
