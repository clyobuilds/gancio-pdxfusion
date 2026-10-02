<script setup lang="ts">
import debounce from 'lodash/debounce'
import useIsSearchingCalendar from '@/composables/useIsSearchingCalendar'

const settings = useState<Settings>('settings')
const route = useRoute()

const { params, pending } = useEvents()
const onSearchChanged = debounce((value) => {
  params.value.query = value || undefined
  navigateTo({ query: { query: params.value.query } })
}, 500)

const { data: collections } = await useFetch<Collection[]>('/api/collections', { query: { pin: true } })

const show_search = computed(() => route?.name === 'index')
const show_calendar = computed(() => !settings.value?.hide_calendar && route?.name === 'index')
const show_collections_bar = computed(() => ['index', 'collection-name'].includes(route?.name))
const isCalendarDisabled = computed(oldValue => pending.value ? oldValue : !!params.value.query)
const isSearchingDates = useIsSearchingCalendar()
</script>

<template>
<div id="navsearch" class="mt-2 mt-sm-4">
  <div class="mx-2">
    <v-text-field
      v-if="show_search"
      id="main-search"
      class="bg-transparent-semi"
      color="primary"
      variant="outlined"
      density="comfortable"
      hide-details
      :placeholder="$t('common.search')"
      clearable
      :model-value="params.query"
      prepend-inner-icon="mdi-magnify"
      @update:model-value="onSearchChanged"
    >
      <template #append-inner>
        <v-menu
          v-if="!show_calendar && !isCalendarDisabled"
          location="bottom center"
          width="100%"
          transition="slide-y-transition"
          scroll-strategy="block"
          :close-on-content-click="false"
          :eager="isSearchingDates"
        >
          <template #activator="{ props: activatorProps }">
            <v-divider vertical class="my-3 mx-1" />
            <div class="me-n1">
              <v-badge color="error" dot :model-value="isSearchingDates">
                <v-btn icon="mdi-calendar-search" density="comfortable" v-bind="activatorProps" />
              </v-badge>
            </div>
          </template>
          <div id="floating-calendar" class="w-100 px-sm-2 mt-1">
            <v-sheet class="elevation-8 rounded">
              <CoreCalendar />
            </v-sheet>
          </div>
        </v-menu>
      </template>
    </v-text-field>
    <div v-if="show_collections_bar">
      <v-btn
        v-for="collection in collections"
        :key="collection.id"
        class="mr-2 mt-2 bg-transparent-semi"
        size='small'
        variant="outlined"
        color="primary"
        :to="`/collection/${encodeURIComponent(collection.name)}`"
      >
        {{ collection.name }}
      </v-btn>
    </div>

    <!-- Calendar -->
    <template v-if='show_calendar'>
      <div v-show='!isCalendarDisabled' class="mt-2">
        <CoreCalendar />
      </div>
    </template>

  </div>
</div>
</template>

<style>
#navsearch, #floating-calendar {
  margin: 0 auto;
  max-width: 600px;
}

.bg-transparent-semi {
  background: var(--bg-transparent-semi);
  backdrop-filter: blur(6px);
}

.v-theme--light {
  --bg-transparent-semi: rgba(250,250,250,0.75);
}

.v-theme--dark {
  --bg-transparent-semi: rgba(10,10,10,0.75);
}
</style>
