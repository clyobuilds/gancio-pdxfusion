<script setup lang="ts">
const time = useTime()
const settings = useState<Settings>('settings')
const { $copyToClipboard } = useNuxtApp()
const canShare = useShare()
const { event, lazy = false, hideThumbs = false } = defineProps<{
  event: EventAPI
  lazy?: boolean
  hideThumbs?: boolean
}>()

const isPast = computed(() => {
  const now = new Date()
  if (event.end_datetime) {
    return new Date(event.end_datetime * 1000) < now
  } else {
    return new Date((3 * 60 * 60 + event.start_datetime) * 1000) < now
  }
})

const isCancelled = computed(() => event.status === 'EventCancelled')

// share the event with the system share dialog, or copy its link where that is not available
const eventUrl = computed(() => `${settings.value.baseurl}/event/${event.slug || event.id}`)
function shareEvent() {
  if (canShare.value) {
    canShare.value({ url: eventUrl.value, title: event.title })
  } else {
    $copyToClipboard(eventUrl.value)
  }
}
</script>

<template>
<article class='h-event event-card' itemscope itemtype="https://schema.org/Event">
  <nuxt-link :to='`/event/${event.slug || event.id}`' itemprop="url">
    <!-- <nuxt-picture/> -->
    <CoreImg v-if='!hideThumbs' :event='event' thumb :lazy='lazy' />
    <v-icon v-if='isPast' class='float-right mr-1' color='warning' icon='mdi-timer-sand' />
    <h3 class='event-title' itemprop="name" :class="isCancelled && 'text-decoration-line-through'">{{ event.title }}</h3>
  </nuxt-link>

  <v-btn
    class='share-button position-absolute top-0 right-0 ma-1'
    variant='text' density='comfortable' icon='mdi-share-variant'
    :aria-label="$t('common.share')" :title="$t('common.share')"
    @click.prevent='shareEvent' />

  <v-avatar v-if='event?.ap_user?.image' size="small" class="position-absolute top-0 right-0 ma-2 pointer-ev-none">
    <v-img :src='event.ap_user.image' :alt="event.ap_user.name" />
  </v-avatar>

  <v-card-text class='pt-0 pb-3'>

    <div class="d-flex ga-2 align-center mb-1">
      <v-icon icon='mdi-calendar' />
      <!-- <time class="dt-start text-subtitle-1" :datetime="time.time(event.start_datetime)" itemprop="startDate" :content="time.timeToISO(event.start_datetime)">{{time.time(event.start_datetime)}}</time> -->
      <time
        class='dt-start text-body-2 text-md-body-1'
        :datetime='time.unixFormat(event.start_datetime, "yyyy-MM-dd HH:mm")'
        itemprop="startDate"
        :content="time.unixFormat(event.start_datetime, 'yyyy-MM-dd\'T\'HH:mm')"
      >
        {{ time.when(event) }}
      </time>
      <time
        v-if='event.end_datetime && event.displayEndTime !== false'
        class='d-none dt-end'
        itemprop="endDate"
        :content="time.unixFormat(event.end_datetime,'yyyy-MM-dd\'T\'HH:mm')"
      >
        {{ time.unixFormat(event.end_datetime)}}
      </time>
    </div>

    <div v-if='event.place' class="d-flex ga-2 align-center">
      <v-icon icon="mdi-map-marker" />
      <nuxt-link
        class='place p-location text-body-2 text-md-body-1'
        :to='`/place/${event.place.id}/${encodeURIComponent(event.place.name)}`'
        itemprop="location" itemscope itemtype="https://schema.org/Place">
        <span itemprop='name'>{{ event.place.name }}</span>
      </nuxt-link>
      <div class='d-none' itemprop='address'>{{ event.place.address }}</div>
    </div>

    <div v-if='event.tags?.length' class='d-flex flex-wrap ga-1 mt-3'>
      <v-chip
        v-for='tag in event.tags.slice(0, 6)' :key='tag' size='small' label
        :to='`/tag/${encodeURIComponent(tag)}`' variant='outlined' color='primary'>{{ tag }}</v-chip>
    </div>
  </v-card-text>

</article>
</template>

<style>

.event-card a {
  text-decoration: none;
}

.event-card a:hover {
  text-decoration: underline;
}

.event-card .event-title {
  overflow: hidden;
  margin: 0.5rem 1rem 0.5rem 1rem;
  text-overflow: ellipsis;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  font-size: 1.1em !important;
  line-height: 1.2em !important;
}

.dt-start::first-letter, .dt-end::first-letter {
  text-transform: uppercase;
}
</style>
