<!--
Start a new event from an existing one: search by title, venue or type, pick one, and the add form opens filled in
(the dates are left empty).
-->
<script setup lang="ts">
import { refDebounced } from '@vueuse/core'

const time = useTime()
const search = ref('')
const searchDebounced = refDebounced(search, 300)
const items = ref<EventAPI[]>([])
const loading = ref(false)

watch(searchDebounced, async (q) => {
  q = q?.trim() ?? ''
  if (q.length < 2) {
    items.value = []
    return
  }
  loading.value = true
  try {
    // newest first, past events included. `include_parent` lists a repeating series once (its first event), not once per date.
    // (No `max` here: Gancio's search fails when a result limit is combined with a text query, so the list is cut below.)
    const found = await $fetch<EventAPI[]>('/api/events', { params: { query: q, start: 0, reverse: true, show_recurrent: false, include_parent: true } })
    items.value = found.slice(0, 10)
  } catch {
    items.value = []
  }
  loading.value = false
})

function pick(event: EventAPI | null) {
  if (event?.id) {
    navigateTo({ path: '/add', query: { copy: event.id } })
  }
}
</script>

<template>
<v-autocomplete
  v-model:search="search"
  :items="items"
  item-title="title"
  :label="$t('common.copy_from_event')"
  :hint="$t('common.copy_from_event_hint')"
  prepend-icon="mdi-content-copy"
  density="compact" variant="outlined" persistent-hint no-filter hide-no-data return-object clearable
  :loading="loading"
  @update:model-value="pick"
>
  <template #item="{ item, props }">
    <v-list-item
      v-bind="props"
      :title="item.raw.title"
      :subtitle="`${time.unixFormat(item.raw.start_datetime, 'MMM d, yyyy')} · ${item.raw.place?.name ?? ''}`" />
  </template>
</v-autocomplete>
</template>
