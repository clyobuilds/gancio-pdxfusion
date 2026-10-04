<!--
Choose event location
-->
<script setup lang='ts'>
import { refDebounced } from '@vueuse/core'
const settings = useState<Settings>('settings')
const event = defineModel<EventAPI>('event', { type: Object, required: true })
if (!event.value?.place) {
  event.value.place = { name: '', address: '' }
}
const whereInputAdvancedDialog = ref(false)

// should I ask for address (only on new places)
const disableAddress = computed(() => event.value?.place?.id)
const isOnLine = computed(() => settings.value.allow_online_event && 'online' === event?.value?.place?.name)

const search = ref('')
const searchDebounced = refDebounced(search, 200)
const { data: places } = await useFetch('/api/places', { params: { query: searchDebounced } })

const selectablePlaces = computed(() => {
  // select matched places without online
  const ret: (PlaceAPI & { props?: { prependIcon?: string, color?: string } })[] = places?.value?.filter(place => place.name?.toLowerCase() !== 'online') ?? []

  // add online if allowed
  if (settings.value.allow_online_event) {
    ret.push({ name: 'online', props: { prependIcon: 'mdi-laptop-account', color: 'primary' } })
  }

  const searchTerm = search.value.trim().toLocaleLowerCase()
  const matches = ret.find(p => searchTerm === p.name?.toLocaleLowerCase())
  if (!matches && searchTerm) {
    ret.unshift({
      name: search.value.trim(),
      props: { prependIcon: 'mdi-plus', color: 'primary' } })
  }
  return ret
})

function selectPlace(place: PlaceAPI) {
  if (!place) {
    event.value.place = { name: '', address: '' }
  } else {
    event.value.place = place
  }
}

// address suggestions while typing (only for a new place, and only when geolocation is enabled)
type Suggestion = { name?: string, display_name: string, icon: string, lat: number, lon: number, address: PostalAddress }
const suggestions = ref<Suggestion[]>([])
const suggesting = ref(false)
const addressSearch = ref('')
const addressSearchDebounced = refDebounced(addressSearch, 400)
let picked = ''
watch(addressSearchDebounced, async (q) => {
  q = q?.trim() ?? ''
  if (!settings.value.allow_geolocation || disableAddress.value || q.length < 3 || q === picked) {
    suggestions.value = []
    return
  }
  suggesting.value = true
  try {
    suggestions.value = await $fetch<Suggestion[]>('/api/geocode', { params: { q } })
  } catch {
    suggestions.value = []
  }
  suggesting.value = false
})

function typeAddress(q: string | null) {
  // choosing a suggestion also reports its text as "typed": keep the coordinates it brought
  if (q && q === picked) {
    return
  }
  addressSearch.value = q ?? ''
  event.value.place.address = q ?? ''
  // typing again discards coordinates of an earlier suggestion
  event.value.place.latitude = event.value.place.longitude = undefined
  event.value.place.postal_address = undefined
}

function pickSuggestion(v: Suggestion | string | null) {
  if (!v || typeof v === 'string') {
    return
  }
  const address = addressToString(v.address)
  picked = address
  suggestions.value = []
  event.value.place.address = address
  event.value.place.latitude = v.lat
  event.value.place.longitude = v.lon
  event.value.place.postal_address = v.address
}

const address = ref()
function selectFirst () {
  const items = selectablePlaces.value
  if (items?.[0]) {
    selectPlace(items[0])
    nextTick(address.value.focus)
  }
}

</script>
<template>
<v-row class="mb-4">
  <v-col cols="12" md="4">
    <!-- name -->
    <v-combobox
      ref="place"
      v-model:search.trim.toLowerCase='search'
      :model-value="event.place"
      :rules="[$valid.required('common.where')]"
      :label="$t('common.where')"
      no-filter
      prepend-icon="mdi-map-marker"
      density='default'
      auto-select-first
      return-object
      :items="selectablePlaces"
      item-title='name'
      item-subtitle='address'
      @keydown.enter.prevent="selectFirst"
      @keydown.tab.prevent="selectFirst"
      @update:model-value="selectPlace"
    />
  </v-col>

  <!-- address -->
  <v-col v-if="!isOnLine" cols="12" :md="settings.allow_online_event?5:8">
    <v-combobox
      ref="address" :model-value="event.place.address" class="mr-4" prepend-icon="mdi-map"
      :disabled="typeof event?.place?.id === 'number' || !event.place.name"
      :rules="[ v => disableAddress ? true : $valid.required('common.address')(v)]" :label="$t('common.address')"
      :hint="$t('event.address_description')" persistent-hint
      :items="suggestions" item-title="display_name" return-object no-filter hide-no-data hide-selected
      :loading="suggesting" :menu-icon="''" autocomplete="off"
      @update:search="typeAddress" @update:model-value="pickSuggestion">
      <template #item="{ item, props }">
        <v-list-item v-bind="props" :title="item.raw.name || item.raw.display_name" :subtitle="item.raw.name ? item.raw.display_name : ''" :prepend-icon="item.raw.icon" />
      </template>
      <template v-if="settings.allow_geolocation" #append>
        <t-btn tooltip="admin.geolocation" size="small" icon='mdi-map-search' @click="whereInputAdvancedDialog = true" />
      </template>
    </v-combobox>
  </v-col>

  <v-col v-if="settings.allow_online_event" cols="12" :md="isOnLine?8:3">
    <v-combobox
      v-model="event.online_locations" class="mr-4"
      prepend-icon="mdi-link" :hint="$t('event.online_locations_help')"
      :label="$t('event.online_locations')"
      :rules="isOnLine ? [$valid.requiredMulti('event.online_locations')] : []"
      clearable chips
      multiple
      density='default'
      closable-chips
      hide-no-data
      hide-selected
      persistent-hint
      :delimiters="[',', ';', '; ']" />
  </v-col>
  <v-dialog
    v-model="whereInputAdvancedDialog"
    destroy-on-close="destroy-on-close"
    max-width="700px" :fullscreen="$vuetify.display.mobile" density="dense">
    <WhereInputAdvanced
      v-model:place="event.place" @close="whereInputAdvancedDialog = false" />
  </v-dialog>

</v-row>

</template>
