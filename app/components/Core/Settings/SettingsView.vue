<script setup lang="ts">
import { SELECTED_SETTINGS_VIEW_KEY } from './constants'

const props = defineProps<{
  value: string
}>()

const selectedView = inject<Ref<string>>(SELECTED_SETTINGS_VIEW_KEY)
const isSelected = computed(() => selectedView?.value === props.value)
</script>
<template>
<slot v-if="isSelected" />
</template>
