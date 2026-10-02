<script setup lang="ts">

const { $notify } = useNuxtApp()

type ISOCountry = {
  code: string
  name: string
}
const { data: countries } = await useFetch<ISOCountry[]>('/isoCountries.json')

const mapPreview = ref(false)
const mapCenter = ref([42, 42])
const mapKey = ref(0)

const testingTilelayer = ref(false)
const testingGeocoding = ref(false)

const tilelayer_provider_default = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const tilelayer_provider_attribution_default = '<a target=\'_blank\' href="http://osm.org/copyright">OpenStreetMap</a> contributors'

const geocoding_provider = manageSetting('geocoding_provider')
const geocoding_countrycodes = manageSetting('geocoding_countrycodes')
const tilelayer_provider = manageSetting('tilelayer_provider')
const tilelayer_provider_attribution = manageSetting('tilelayer_provider_attribution')

async function testGeocodingProvider() {
  // random query
  testingGeocoding.value = true
  const q = Math.random().toString(36).slice(2, 7)
  try {
    await $fetch(`/api/geocode`, { query: { q }, timeout: 3000 })
    $notify('admin.geocoding_test_success')
  } catch (e) {
    console.error(e)
    $notify('admin.geocoding_test_error', Statuses.ERROR)
  }
  testingGeocoding.value = false
}

async function testTileLayerProvider() {
  testingTilelayer.value = true
  mapKey.value++
  mapPreview.value = true
}

function tilelayerTestError() {
  $notify('admin.tilelayer_test_error', Statuses.ERROR)
  testingTilelayer.value = false
}

function tilelayerTestSuccess() {
  $notify('admin.tilelayer_test_success')
  testingTilelayer.value = false
}

</script>
<template>
<div class="d-flex flex-column ga-8 mt-4">
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span v-html="$t('admin.geolocation_description')" />

  <div>
    <v-form>
      <v-row>
        <!-- <v-col cols="12" md="3"> -->
        <!--   <v-autocomplete v-model="geocoding_provider_type" class="mb-4" :label="$t('admin.geocoding_provider_type')" -->
        <!--     :hint="$t('admin.geocoding_provider_type_help')" persistent-hint :items="geocoding_provider_type_items" -->
        <!--     :placeholder="geocoding_provider_type_default" -->
        <!--     @blur="save('geocoding_provider_type', geocoding_provider_type)" /> -->
        <!-- </v-col> -->
        <!---->
        <v-col cols="12" md="5">
          <v-text-field
            v-model="geocoding_provider" class="mb-4" :label="$t('admin.geocoding_provider')"
            :hint="$t('admin.geocoding_provider_help')" persistent-hint />
          <!-- :placeholder="geocoding_provider_default" /> -->
        </v-col>

        <!-- :disabled="!(geocoding_provider_type === null || geocoding_provider_type === 'Nominatim')" -->
        <v-col cols="12" md="4">
          <v-autocomplete
            v-model="geocoding_countrycodes" :disabled="!countries" class="mb-6"
            :label="$t('admin.geocoding_countrycodes')" :items="countries" multiple chips persistent-hint
            item-value="code" item-title="name" :hint="$t('admin.geocoding_countrycodes_help')" />
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="tilelayer_provider" class="mb-4" :label="$t('admin.tilelayer_provider')"
            :hint="$t('admin.tilelayer_provider_help')" persistent-hint :placeholder="tilelayer_provider_default" />
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            v-model="tilelayer_provider_attribution" :label="$t('admin.tilelayer_provider_attribution')"
            :placeholder="tilelayer_provider_attribution_default" />
        </v-col>
      </v-row>

      <Map
        v-if="mapPreview" :key="mapKey" :l-map-styles="{ height: '20rem' }" :show-marker="false"
        :map-center="mapCenter" :zoom="10" @tileerror="tilelayerTestError" @tileload="tilelayerTestSuccess" />
    </v-form>
  </div>

  <div class="d-flex justify-end ga-4">
    <v-btn color="primary" :loading="testingGeocoding" variant='outlined' @click="testGeocodingProvider">
      {{ $t('admin.geocoding_test_button') }}
    </v-btn>
    <v-btn color="primary" :loading="testingTilelayer" variant='outlined' @click="testTileLayerProvider">
      {{ $t('admin.tilelayer_test_button') }}
    </v-btn>
  </div>
</div>
</template>
