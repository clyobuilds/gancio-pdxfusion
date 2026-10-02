<script setup lang="ts">
import debounce from 'lodash/debounce'

const modelValue = defineModel('modelValue', { type: Object, default: () => ({ }) })
const settings = useState<Settings>('settings')

const { data: collections } = await useFetch('/api/collections')

const searchTag = ref('')
const tags = ref([])
const fetchTags = debounce(async () => {
  try {
    const response = await $fetch(`/api/tags?query=${encodeURIComponent(searchTag.value)}`)
    tags.value = response
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  }
}, 200)

const searchPlace = ref('')
const places = ref([])
const fetchPlaces = debounce(async () => {
  try {
    const response = await $fetch(`/api/places?query=${encodeURIComponent(searchPlace.value)}`)
    places.value = response
  } catch (error) {
    console.error('Failed to fetch places:', error)
  }
}, 200)

onMounted(() => {
  fetchTags()
  fetchPlaces()
})

</script>

<template>
<v-row>

  <!-- filter recurrent event -->
  <v-col v-if="settings.allow_recurrent_event" sm="3" cols="12">
    <v-switch
      v-if="settings.allow_recurrent_event"
      v-model="modelValue.show_recurrent"
      :label="$t('event.show_recurrent')"
    />
  </v-col>

  <v-col>
    <v-autocomplete
      v-model="modelValue.tags"
      :label="$t('common.tags')"
      variant='outlined'
      chips
      closable-chips
      multiple
      :items="tags"
      @update:search="searchTag"
    />
  </v-col>

  <v-col>
    <v-autocomplete
      v-model="modelValue.places"
      :label="$t('common.places')"
      variant="outlined"
      chips
      closable-chips
      multiple
      :items="places"
      item-value="id"
      item-id="id"
      item-title="name"
      item-subtitle="address"
      @update:search="searchPlace"
    />
  </v-col>

  <v-col v-if='collections?.length' sm="4" cols="12">
    <v-autocomplete
      v-model="modelValue.collection"
      class="p-0"
      variant='outlined'
      :label="$t('common.collections')"
      hide-details
      color="primary"
      hide-selected
      :menu-props="{ maxWidth: '400' }"
      :items="collections"
      hide-no-data
      clearable
      item-title="name"
    />
  </v-col>
</v-row>

</template>
