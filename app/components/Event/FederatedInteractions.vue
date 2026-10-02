<script setup lang="ts">
const { event } = defineProps<{
  event: EventAPI
}>()

const shouldShow = computed(() => event.boost?.length || event.likes?.length)
</script>
<template>
<div v-if="shouldShow">
  <v-divider variant="dashed" />
  <div class="d-flex align-center ga-3 pt-4">
    <div class="d-flex align-center ga-2">
      <v-icon icon="mdi-repeat-variant" size="small" />
      <span class="text-subtitle-2">{{ $t("activitypub.n_boosts", event.boost?.length || 0) }}</span>
    </div>
    <span class="text-disabled font-weight-bold">·</span>
    <div class="d-flex align-center ga-2">
      <v-icon icon="mdi-star-outline" size="small" />
      <span class="text-subtitle-2">{{ $t("activitypub.n_favorites", event.likes?.length || 0) }}</span>
    </div>
  </div>
</div>
</template>
