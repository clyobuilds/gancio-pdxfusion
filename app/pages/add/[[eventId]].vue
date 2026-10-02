<!-- Add / Edit event

 -->
<script setup lang="ts">
import { refDebounced } from '@vueuse/core'

const { loggedIn } = useUserSession()
const { $notify } = useNuxtApp()
const settings = useState<Settings>('settings')

const { t } = useI18n()
useHead({ title: `${settings.value.title} - ${t('common.add_event')}` })

const route = useRoute()

const event = ref<EventAPI>({
  title: '',
  is_visible: true,
  start_datetime: 0,
  description: '',
  media: [{}],
  place: { name: '', address: '' },
  status: 'EventScheduled',
  displayEndTime: false
})

let eventId = route.params.eventId
if (eventId) {
  const { data, error } = await useFetch<EventAPI>(() => `/api/event/detail/${route.params.eventId}`)
  if (error.value) {
    throw createError(error.value)
  }
  if (!data.value) {
    throw createError({ status: 404, statusMessage: 'Event not found' })
  } else {
    if (route.query.clone === 'true') {
      eventId = undefined
    }
    event.value = data.value
  }
}

const valid = ref(false)
const loading = ref(false)
const form = ref()

// const openImportDialog = ref(false)
const searchTag = ref('')
const searchTagDebounced = refDebounced(searchTag, 200)
const { data: tags, status: statusTags } = await useFetch('/api/tags', { params: { query: searchTagDebounced } })

async function draft() {
  await done(false)
}

async function publish() {
  await done(true)
}

async function done(publish) {
  const evt = event.value
  if (loading.value) {
    return
  }

  const formValidation = await form.value.validate()
  if (!formValidation.valid) {
    console.error('validation error!')
    return
  }

  loading.value = true

  const formData = new FormData()

  formData.append('is_visible', publish)

  if (evt?.media?.[0]) {
    const media: Media = evt.media[0]
    if (media?.image) {
      formData.append('image', media.image)
    }

    if (media?.url) {
      formData.append('image_url', media.url)
    }

    if (media?.name) {
      formData.append('image_name', media.name)
    }

    if (media?.focalpoint) {
      formData.append('image_focalpoint', JSON.stringify(media.focalpoint))
    }
  }

  formData.append('title', evt.title)
  if (evt?.place?.id) {
    formData.append('place_id', String(evt.place?.id))
  }
  formData.append('place_name', evt.place?.name ?? '')

  if (evt.place?.address) {
    formData.append('place_address', evt?.place?.address ?? '')
  }

  if (evt.place?.postal_address) {
    formData.append('place_postal_address', JSON.stringify(evt.place.postal_address))
  }

  if (settings.value.allow_geolocation) {
    formData.append('place_latitude', String(evt?.place?.latitude ?? ''))
    formData.append('place_longitude', String(evt?.place?.longitude ?? ''))
  }

  if (evt.online_locations?.length) {
    evt.online_locations.forEach((l: string) => formData.append('online_locations[]', l))
  }

  formData.append('description', evt.description ?? '')
  formData.append('start_datetime', evt.start_datetime.toString())

  if (evt.end_datetime) {
    formData.append('end_datetime', evt.end_datetime.toString())
  }

  if (evt.recurrent?.frequency) {
    formData.append('recurrent', JSON.stringify({
      ...evt.recurrent,
      ...(evt.recurrent.type && ({ type: String(evt.recurrent.type) }))
    }))
  }

  if (normalizedTags?.value?.length) {
    normalizedTags.value?.forEach(tag => formData.append('tags[]', tag))
  } else {
    formData.append('tags[]', '')
  }

  //
  try {
    const ret: EventAPI = eventId ?
        await $fetch(`/api/events/${eventId}`, { method: 'PUT', body: formData }) :
        await $fetch('/api/events', { method: 'POST', body: formData })

    // navigate to created event in case its already visible and not a recurrent event!
    if (!evt.recurrent?.frequency && (ret.is_visible || loggedIn.value)) {
      navigateTo(`/event/${ret.slug}`)
    } else {
      navigateTo('/')
    }

    $notify(loggedIn.value ? (eventId ? 'event.saved' : 'event.added') : 'event.added_anon', Statuses.SUCCESS)
  } catch (e) {
    switch (e?.request?.status) {
      case 413:
        $notify('event.image_too_big', Statuses.ERROR)
        break
      default:
        $notify(e, Statuses.ERROR)
    }
  }
  loading.value = false
}

const normalizedTags = computed({
  get: () => event?.value?.tags ?? [],
  set: (newTags: string[]) => {
    const seen = new Set()
    const tags = []
    for (const tag of newTags) {
      const norm = tag.toLocaleLowerCase().trim()
      if (!seen.has(norm)) {
        seen.add(norm)
        tags.push(tag)
      }
    }
    event.value.tags = tags
  }
})

</script>
<template>
<v-container class="pa-0 pa-md-3">
  <v-card>
    <v-card-title>
      <!-- <v-btn variant='outlined' class='float-right' color='primary' @click='openImportDialog = true' prepend-icon="mdi-file-import">{{$t('common.import') }}</v-btn> -->
      <v-chip v-if="!event.is_visible" class='float-right' size='small'>{{ t('common.draft') }}</v-chip>
      <h4>{{ eventId ? t('common.edit_event') : t('common.add_event') }}</h4>
    </v-card-title>
    <!-- <v-dialog v-model='openImportDialog' :fullscreen='$vuetify.display.mobile'>
        <ImportDialog @close='openImportDialog = false' />
      </v-dialog> -->
    <v-card-text class='px-0 px-xs-2'>
      <v-form ref='form' v-model='valid'>
        <v-container>
          <v-row>
            <!-- Not logged event -->
            <v-col v-if='!loggedIn' cols=12>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p v-html="t('event.anon_description')" />
            </v-col>

            <!-- Title -->
            <v-col cols=12>
              <v-text-field
                ref='title' v-model="event.title" prepend-icon='mdi-format-title'
                :label="t('common.title')" :rules="[$valid.required('common.title')]" autofocus />
            </v-col>

            <!-- Where -->
            <v-col cols=12>
              <WhereInput ref='where' v-model:event='event' />
            </v-col>

            <!-- When -->
            <DateInput ref="when" v-model:event="event" />

            <!-- Description -->
            <v-col class='px-0' cols='12'>
              <CoreEditor
                v-model='event.description' class='px-3 ma-0' :label="t('event.description_description')"
                :placeholder="t('event.description_description')" max-height='400px' />
            </v-col>

            <!-- MEDIA / FLYER / POSTER -->
            <v-col cols=12 md=6>
              <MediaInput v-model:media='event.media' :event='event' />
            </v-col>

            <!-- TAGS -->
            <v-col cols=12 md=6>
              <v-combobox
                v-model:search="searchTag" v-model="normalizedTags" prepend-icon="mdi-tag-multiple" chips no-filter
                multiple closable-chips hide-no-data hide-selected persistent-hint :loading="statusTags === 'pending'"
                :delimiters="[',', ';']" :items="tags || []"
                :label="t('common.tags')"/>
            </v-col>

          </v-row>
        </v-container>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn :loading='loading' :disabled='!valid || loading' variant='outlined' color='primary' @click='draft'>{{
        eventId ?
          event.is_visible ? t('common.convert_draft') : t('common.save_draft')
          : loggedIn ? t('common.create_draft') : t('common.send') }}</v-btn>
      <v-btn v-if='loggedIn' :loading='loading' :disabled='!valid || loading' variant='outlined' color='primary' @click='publish'>
        {{ t('common.publish') }}</v-btn>
    </v-card-actions> </v-card>
</v-container>
</template>
