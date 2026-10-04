<!-- Add / Edit event

 -->
<script setup lang="ts">
const { loggedIn } = useUserSession()
const { $notify } = useNuxtApp()
const settings = useState<Settings>('settings')

const { t } = useI18n()
useHead({ title: `${settings.value.title} - ${t('common.add_event')}` })

const route = useRoute()

// opening /add?copy=ID starts a new event from an existing one: the page is rebuilt when ID changes
definePageMeta({ key: route => route.fullPath })

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
const copyId = route.query.copy
const copiedFrom = ref('')
if (eventId || copyId) {
  const { data, error } = await useFetch<EventAPI>(() => `/api/event/detail/${eventId || copyId}`)
  if (error.value) {
    throw createError(error.value)
  }
  if (!data.value) {
    throw createError({ status: 404, statusMessage: 'Event not found' })
  } else {
    if (route.query.clone === 'true' || copyId) {
      eventId = undefined
    }
    event.value = data.value
    if (copyId) {
      // a copy keeps everything but the dates, the flyer and any repeating: those are picked again
      copiedFrom.value = data.value.title
      event.value = {
        ...data.value,
        id: undefined,
        slug: undefined,
        parentId: undefined,
        parent: undefined,
        is_visible: true,
        status: 'EventScheduled',
        // the flyer is not copied (the server cannot reuse a stored flyer, and a new date usually needs a new flyer)
        media: [{}],
        start_datetime: 0,
        end_datetime: undefined,
        // a copy is a single event; make it repeat on purpose with "Recurring"
        recurrent: undefined
      } as EventAPI
    }
  }
}

const valid = ref(false)
const loading = ref(false)
const form = ref()

// const openImportDialog = ref(false)
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

  formData.append('cost', evt.cost ?? '')
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

  if (evt.tags?.length) {
    evt.tags.forEach(tag => formData.append('tags[]', tag))
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

// the event's categories are the tags we ask for; any other tag it already has is kept
const category = computed({
  get: () => categoriesOf(event.value.tags) as string[],
  set: (value: string[]) => {
    const others = (event.value.tags ?? []).filter(t => !EVENT_CATEGORIES.some(c => c.toLowerCase() === t.toLowerCase()))
    event.value.tags = [...others, ...(value ?? [])]
  }
})

</script>
<template>
<v-container class="pa-0 pa-md-3">
  <!-- Start from an existing event: above the form, so it is at the top but is not the first thing in it -->
  <div v-if="!eventId && route.query.clone !== 'true'" class="mb-3 px-3 px-md-0">
    <EventCopyPicker />
  </div>
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

            <!-- Said so when this form was started from another event -->
            <v-col v-if="copiedFrom" cols=12>
              <v-alert type="info" variant="tonal" density="compact">
                {{ t('common.copied_from', { title: copiedFrom }) }}
              </v-alert>
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

            <!-- Cost (optional) -->
            <v-col cols=12>
              <v-text-field
                v-model="event.cost" prepend-icon="mdi-cash" :label="t('common.cost')"
                :hint="t('common.cost_hint')" persistent-hint maxlength="60" />
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

            <!-- CATEGORY (stored as a tag) -->
            <v-col cols=12>
              <v-select
                v-model="category" prepend-icon="mdi-shape" :label="t('common.event_type')" multiple chips closable-chips :hint="t('common.event_type_hint')" persistent-hint
                :items="EVENT_CATEGORIES.map(c => ({ value: c, title: t(`common.type_${c.toLowerCase()}`) }))"
                :rules="[$valid.requiredMulti('common.event_type')]" />
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
