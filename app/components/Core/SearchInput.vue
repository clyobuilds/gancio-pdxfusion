<script setup lang="ts">
import debounce from 'lodash/debounce'

defineProps<{
  label?: string
}>()
const [model, modifiers] = defineModel<string>()

const _setValue = (value: string) => model.value = value
const setValue = modifiers.debounce ? debounce(_setValue, 800) : _setValue
</script>
<template>
<div class="search-container d-flex">
  <v-text-field
    prepend-inner-icon="mdi-magnify"
    :label="label || $t('common.search')"
    single-line
    hide-details
    variant="outlined"
    density="compact"
    :model-value="model"
    @update:model-value="setValue"
  />
</div>
</template>
<style scoped>
  .search-container {
    min-width: min(320px, 100%);
  }
</style>
