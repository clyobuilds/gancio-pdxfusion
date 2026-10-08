<script setup lang="ts">
const settings = useState<Settings>('settings')
const { $notify, $prompt } = useNuxtApp()
const { t } = useI18n()
const time = useTime()
const { user } = useUserSession()
const route = useRoute()
const { isAdmin } = useAuth()
const { data: event, refresh, error } = await useFetch<EventAPI>(`/api/event/detail/${route.params.slug}`)
if (!event.value || error.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 500,
    message: error.value?.message ?? error.value?.statusMessage ?? 'Fetch Error',
    data: error.value?.data
  })
}

const canonicalUrl = computed(() => `${settings.value.baseurl}/event/${event.value?.slug || event.value?.id}`)

useHead({
  title: `${settings.value.title} - ${event.value.title}`,
  meta: [
    { property: 'og:title', content: event.value.title },
    { property: 'og:description', content: event.value?.plain_description ?? '' },
    { property: 'og:title', content: event.value.title },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:type', content: 'event' },
    { property: 'og:image', content: mediaURL(event.value) },
    { property: 'og:image:alt', content: mediaURL(event.value, 'alt') },
    { property: 'og:site_name', content: settings.value.title },
    { property: 'twitter:card', content: 'summary ' },
    { property: 'twitter:image', content: mediaURL(event.value) },
    { property: 'profile:username', content: `@${settings.value.instance_name}@${settings.value.hostname}` }
    // { property: 'og:updated_time'},
    // { property: 'og:updated_time' },
  ],
  link: [
    { rel: 'canonical', href: canonicalUrl },
    { rel: 'alternate', type: 'application/rss+xml', title: settings.value.title, href: `${settings.value.baseurl}/feed/rss` }
  ]
})

const hasMedia = computed(() => event?.value?.media?.length)
const isCancelled = computed(() => event?.value?.status === 'EventCancelled')
const showEmbed = ref(false)
const mapModal = ref(false)
const openModeration = ref(route.query?.moderation ? true : false)
const openAssignAuthor = ref(false)
const showModeration = computed(() => settings.value.enable_moderation && (event?.value?.is_mine || user?.value?.role === 'admin' || user?.value?.role === 'editor'))
const canEdit = computed(() => event?.value?.is_mine || user?.value?.role === 'admin' || user?.value?.role === 'editor')
const hasOnlineLocations = computed(() => event?.value?.online_locations?.length)

const share = useShare()
const { isFavorite, toggleFavorite } = useFavorites()
const shareEvent = () => share.value?.({ url: canonicalUrl.value, title: document.title })

// head () {
//   if (!this.event) {
//     return {}
//   }
//   const tags_feed = this.event.tags && this.event.tags.map(tag => ({
//     rel: 'alternate',
//     type: 'application/rss+xml',
//     title: `${this.settings.title} events tagged ${tag}`,
//     href: this.settings.baseurl + `/feed/rss?tags=${tag}`
//   }))
//   const place_feed = {
//     rel: 'alternate',
//     type: 'application/rss+xml',
//     title: `${this.settings.title} events  @${this.event?.place?.name}`,
//     href: this.settings.baseurl + `/feed/rss?places=${this.event?.place?.id}`
//   }
//     ],
//     link: [
//       { rel: 'image_src', href: this.$helper.mediaURL(this.event) },
//       {
//         rel: 'alternate',
//         type: 'application/rss+xml',
//         title: this.settings.title,
//         href: this.settings.baseurl + '/feed/rss'
//       },
//       ...tags_feed,
//       place_feed
//     ]
//   }
// },
// },

async function report() {
  const message = await $prompt('event.report_message_confirmation', 'common.report')
  if (!message) {
    return
  }
  try {
    await $fetch(`/api/events/messages/${event.value?.id}`, { method: 'POST', body: { message } })
    $notify('common.sent')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

</script>
<template>
<v-container
  v-if='event'
  class="h-event mb-4" max-width='1200' itemscope
  itemtype="https://schema.org/Event">
  <!-- EVENT PAGE -->
  <!-- gancio supports microformats (http://microformats.org/wiki/h-event) -->
  <!-- and microdata https://schema.org/Event -->
  <h1 class="text-center text-md-h4 text-h5 pa-6">
    <strong class="p-name text--primary" :class="isCancelled && 'text-decoration-line-through'" itemprop="name">{{ event?.title }}</strong>
  </h1>

  <v-row>
    <v-col cols='12' md='8'>
      <CoreImg v-if="hasMedia" :event="event" />
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="event?.description"
        class="p-description text-body-1 my-4"
        itemprop="description"
        v-html="event?.description"
      />
      <!-- eslint-enable vue/no-v-html -->

    </v-col>

    <v-col cols='12' md='4'>
      <v-card class='border-2'>
        <EventStatus :event="event" />
        <v-container class="eventDetails">
          <v-icon v-if="event?.parent" class="float-right" color="success" icon="mdi-repeat" />
          <time
            class="dt-start" itemprop="startDate"
            :datetime="time.unixFormat(event.start_datetime, 'yyyy-MM-dd HH:mm')"
            :content="time.unixFormat(event.start_datetime, 'yyyy-MM-dd\'T\'HH:mm')"
          >
            <v-icon icon="mdi-calendar" />
            <span class="ml-2 text-uppercase">{{ time.when(event) }}</span>
            <div
              v-if="event?.end_datetime && event.displayEndTime !== false"
              class="d-none dt-end"
              itemprop="endDate"
              :content="time.unixFormat(event.end_datetime,'yyyy-MM-dd\'T\'HH:mm')"
              :datetime="time.unixFormat(event.end_datetime, 'yyyy-MM-dd HH:mm')"
            />
          </time>
          <div class="font-weight-light">
            {{ time.from(event.start_datetime) }}
            <small v-if="event.parent">({{time.recurrentDetail(event)}})</small>
          </div>
          <div v-if="event?.place" class="p-location h-adr" itemprop="location" itemscope itemtype="https://schema.org/Place">
            <v-icon icon="mdi-map-marker" size="small" />
            <nuxt-link
              class="vcard ml-2 p-name text-decoration-none text-uppercase"
              :to="`/place/${event?.place?.id}/${encodeURIComponent(event?.place?.name)}`">
              <span itemprop="name">{{ event?.place?.name }}</span>
            </nuxt-link>
            <div v-if='event?.place?.name !== "online"' class="d-flex align-center font-weight-light">
              <span class="p-street-address" itemprop="address">{{ event?.place?.address }}</span>
              <v-btn
                v-if="event?.place?.address" class="ml-1" icon="mdi-content-copy" size="x-small" variant="text"
                :aria-label="$t('common.copy_address')" :title="$t('common.copy_address')"
                @click="$copyToClipboard(event.place.address)" />
            </div>
          </div>
          <div v-if="event?.cost" class="mt-1">
            <v-icon icon="mdi-cash" size="small" />
            <span class="ml-2 font-weight-light">{{ event.cost }}</span>
          </div>
          <!-- <a class="d-block" v-if="event.ap_object?.url" :href="event.ap_object?.url">{{ event.ap_object?.url }}</a> -->
          <a v-if="event?.original_url" :href="event?.original_url">{{ event.original_url }}</a>
        </v-container>
        <!-- tags, hashtags -->
        <v-container v-if="event?.tags?.length" class="pt-0">
          <v-chip
            v-for="tag in event.tags" :key="tag" class="p-category ml-1 mt-1" density='compact' label color="primary"
            variant='outlined' :to="`/tag/${encodeURIComponent(tag)}`">
            {{ tag }}
          </v-chip>
        </v-container>

        <!-- online events -->
        <v-list v-if="hasOnlineLocations" nav density='compact'>
          <v-list-item
            v-for="(item, index) in event.online_locations" :key="index" target="_blank" :href="`${item}`"
            prepend-icon='mdi-monitor-account' :title='item' />
        </v-list>

        <v-divider />
        <!-- info & actions -->
        <v-list>

          <!-- favorite (kept in this browser) -->
          <v-list-item
            :prepend-icon="isFavorite(event.id) ? 'mdi-star' : 'mdi-star-outline'"
            :title="$t(isFavorite(event.id) ? 'common.favorite_remove' : 'common.favorite_add')"
            @click="toggleFavorite(event.id)" />

          <!-- share/copy link -->
          <v-list-item
            v-if="share"
            prepend-icon="mdi-share-variant"
            :title="$t('common.share')"
            :href="canonicalUrl"
            @click.prevent="shareEvent"
          />
          <v-list-item
            v-else
            prepend-icon='mdi-content-copy'
            :title="$t('common.copy_link')"
            @click="$copyToClipboard(canonicalUrl)"
          />

          <!-- map -->
          <v-list-item
            v-if="settings.allow_geolocation && event?.place?.latitude && event.place?.longitude"
            prepend-icon='mdi-map' :title="$t('common.show_map')" @click="mapModal = true" />

          <!-- calendar -->
          <v-list-item
            :href="`/api/event/detail/${event?.slug || event.id}?format=ics`"
            prepend-icon='mdi-calendar-export' :title="$t('common.add_to_calendar')" />

          <!-- Report -->
          <v-list-item
            v-if="settings.enable_moderation && settings.enable_report && !showModeration" prepend-icon='mdi-message-text-outline'
            :title="$t('common.report')" @click="report" />

          <!-- download flyer -->
          <v-list-item
            v-if="hasMedia && settings.show_download_media" :href="mediaURL(event, 'download')"
            prepend-icon='mdi-file-download-outline' :title="t('event.download_flyer')" />

          <!-- embed -->
          <v-list-item prepend-icon='mdi-code-tags' :title="$t('common.embed')" @click="showEmbed = true" />

        </v-list>
        <!-- admin actions -->
        <EventAdmin
          v-if='canEdit' :event="event" @update='refresh' @open-moderation="openModeration = true"
          @open-assign-author="openAssignAuthor = true" />
      </v-card>
    </v-col>
  </v-row>

  <EventFederatedInteractions
    v-if="settings.enable_federation && !settings.hide_boosts"
    class="mt-4"
    :event="event"
  />
  <LazyEventFederatedResources
    v-if="settings.enable_federation && settings.enable_resources"
    id="resources"
    class="mt-4"
    :event-id="event.id"
    :can-moderate="canEdit"
    hydrate-on-visible
  />

  <client-only>
    <v-dialog v-model="showEmbed" class='event-embed-dialog' width="700px" :fullscreen="$vuetify.display?.mobile">
      <LazyEventEmbed :event="event" @close="showEmbed = false" />
    </v-dialog>

    <v-dialog
      v-if="settings.allow_geolocation && event?.place?.latitude && event.place?.longitude"
      v-model="mapModal" class='event-map-dialog'
      :fullscreen="$vuetify.display?.mobile" destroy-on-close>
      <LazyEventMapDialog :place="event?.place" @close="mapModal = false" />
    </v-dialog>

    <v-dialog
      v-if="isAdmin" v-model="openAssignAuthor" class='event-assign-author-dialog'
      :fullscreen="$vuetify.display?.mobile" destroy-on-close width="400">
      <LazyEventAssignAuthor :event="event" @close="openAssignAuthor = false" @update='refresh' />
    </v-dialog>

    <v-navigation-drawer
      v-model="openModeration" :fullscreen="$vuetify.display?.mobile" location='right' width="400"
      temporary>
      <LazyEventModeration v-if="openModeration" :event="event" @close="openModeration = false" />
    </v-navigation-drawer>
  </client-only>
</v-container>
</template>

<style scoped>
.p-description :deep(p) {
  margin-bottom: .5lh;
}
</style>
