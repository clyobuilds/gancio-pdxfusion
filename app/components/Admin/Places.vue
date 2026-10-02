<script setup lang="ts">
const { t } = useI18n()
const settings = useState<Settings>('settings')
const { $notify } = useNuxtApp()

const form = ref()
const loading = ref(false)
const dialog = ref(false)
const valid = ref(false)
const search = ref('')
const place: PlaceAPI = reactive({ name: '' })

const newPlace = ref()

const headers = [
  { value: 'name', title: t('common.name'), width: 140 },
  { value: 'address', title: t('common.address') },
  { value: 'map', title: 'Map', width: 10 },
  { value: 'actions', title: t('common.actions'), align: 'end', width: 130 }
]

const { data: places, refresh } = await useFetch('/api/places/list', {
  transform: places => places.filter(place => place.name?.toLowerCase() !== 'online')
})

function editPlace(item: PlaceAPI) {
  newPlace.value = null
  place.name = item.name
  place.address = item.address
  place.eventCount = item.eventCount
  if (settings.value.allow_geolocation) {
    place.latitude = item.latitude
    place.longitude = item.longitude
  }
  place.id = item.id
  dialog.value = true
}

async function savePlace() {
  const { valid } = await form.value.validate()
  if (!valid) {
    return
  }
  if (place.postal_address) {
    place.address = addressToString(place.postal_address)
  }
  loading.value = true
  try {
    await $fetch(`/api/places/${place.id}`, {
      method: 'PUT',
      body: newPlace.value || place
    })
    refresh()
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
  newPlace.value = null
  loading.value = false
  dialog.value = false
}

function updatePlace (p) {
  if (!p) {
    newPlace.value = null
    return
  }
  if (typeof p === 'string') {
    newPlace.value = null
    place.name = p
  } else {
    newPlace.value = p
  }
}
</script>
<template>
<div class="d-flex flex-column ga-4">
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="text-subtitle-2 text-medium-emphasis" v-html="$t('admin.place_description')" />

  <div class="d-flex justify-end">
    <CoreSearchInput v-model="search" class="w-100 w-sm-25"/>
  </div>

  <v-dialog v-model="dialog" width="600" :fullscreen="$vuetify.display?.mobile">
    <v-card>
      <v-card-title>
        {{ $t('admin.edit_place') }} -
        <strong class='ml-2'>{{place.name}}</strong>
      </v-card-title>
      <v-card-text class="mb-4">
        <v-form ref="form" v-model="valid">

          <v-combobox
            :model-value="newPlace?.name ?? place.name"
            :rules="[$valid.required('common.name')]"
            :label="$t('common.name')"
            :placeholder="$t('common.name')"
            :items='places.filter(p => place.id !== p.id)'
            item-title='name'
            @update:model-value="updatePlace"
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #title>
                  {{item.raw.name}} <small>({{item.raw.eventCount}})</small>
                </template>
              </v-list-item>
            </template>

          </v-combobox>
          <v-text-field
            v-if="!newPlace"
            ref="address"
            v-model="place.address"
            :rules="[ v => $valid.required('common.address')(v)]"
            :label="$t('common.address')"
            persistent-hint
          />
          <v-alert v-else>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="$t('admin.merge_place_help', { place: place.name, n: place.eventCount })" />
          </v-alert>
          <SearchAddress v-if="settings.allow_geolocation && !newPlace" v-model:place="place" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="outlined" color="warning" @click="dialog = false">
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          :loading="loading"
          :disable="!valid || loading"
          @click="savePlace"
        >
          {{ $t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <div>
    <v-data-table
      :headers="headers"
      :items="places"
      :hide-default-footer="places.length < 5"
      :search="search"
    >
      <template v-slot:item.map="{ item }">
        <v-icon v-if="item.latitude && item.longitude" icon='mdi-map-marker'/>
      </template>
      <template v-slot:item.actions="{ item }">
        <t-btn :tooltip="$t('common.edit')" color="primary" icon='mdi-pencil' @click="editPlace(item)" />
        <t-btn :tooltip="$t('common.preview')" :to="`/place/${item.id}/${encodeURIComponent(item.name)}`" icon='mdi-eye' />
      </template>
    </v-data-table>
  </div>
</div>

</template>
