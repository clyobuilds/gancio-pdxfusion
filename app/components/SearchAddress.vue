<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
const place = defineModel<PlaceAPI>('place', { type: Object, required: true })

const settings = useState<Settings>('settings')
defineEmits(['close', 'update:event'])

const search = ref(place.value.address)
const searchDebounced = refDebounced(search, 600)

const { data: addressList, status, execute } = useFetch('/api/geocode', { params: { q: searchDebounced }, immediate: false, lazy: true })
watch(searchDebounced, (q) => {
  if (q?.length >= 2) {
    execute()
  }
})

function selectAddress (v) {
  if (!v) {
    place.value.latitude = place.value.longitude = null
    place.value.postal_address = null
    return
  }
  if (typeof v === 'object') {
    place.value.latitude = v.lat
    place.value.longitude = v.lon
    place.value.address = addressToString(v.address)
    place.value.postal_address = v.address
  } else {
    place.value.latitude = place.value.longitude = undefined
  }
}

</script>
<template>
<div>
  <v-combobox
    ref='geocodedAddress'
    v-model:search='search'
    prepend-icon='mdi-map-search'
    :model-value="search"
    :label="$t('common.search_coordinates')"
    item-title='name'
    persistent-hint
    hide-no-data clearable no-filter :loading='status === "pending"'
    :items="addressList"
    @update:model-value='selectAddress'>
    <template #message>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span v-html="$t('event.address_description_osm')" />
    </template>
    <template #item="{ item, props }">
      <v-list-item
        v-bind='props'
        :title='item.raw.name'
        :subtitle='item.raw.display_name'
        :prepend-icon='item.raw.icon' />
    </template>
  </v-combobox>

  <v-row class='mt-4'>
    <v-col class='py-0' cols=12 sm=6>
      <v-text-field
        v-model="place.latitude"
        prepend-icon='mdi-latitude'
        :label="$t('common.latitude')"
        :rules="$valid.latitude" />
    </v-col>

    <v-col class='py-0' cols=12 sm=6>
      <v-text-field
        v-model="place.longitude"
        prepend-icon='mdi-longitude'
        :label="$t('common.longitude')"
        :rules="$valid.longitude" />
    </v-col>
  </v-row>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <p v-if='!place?.id' class='mt-4' v-html="$t('event.address_geocoded_disclaimer')" />

  <Map
    v-if="(settings.allow_geolocation && place.latitude && place.longitude)"
    class='mt-4' :place="place" :draggable="true"  />

</div>
</template>
