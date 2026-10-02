<script setup>
defineProps ({
  tooltip: { type: String, default: '' },
  color: { type: String, default: '' },
  to: { type: String, default: '' },
  icon: { type: String, default: '' },
  density: { type: String, default: 'comfortable' },
  size: { type: String, default: 'large' },
  variant: { type: String, default: 'plain' }
})

defineEmits(['click'])
</script>
<template>
<v-tooltip location="top">
  <template #activator="{ props }">
    <v-btn v-bind='props' :color='color' :icon='icon' :variant='variant' :size='size' :density='density' :to='to' @click='$emit("click")' />
  </template>
  <span>{{ $t(tooltip) }}</span>
</v-tooltip>
</template>
