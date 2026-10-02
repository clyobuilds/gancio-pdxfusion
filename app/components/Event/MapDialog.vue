<script setup>
defineProps({
  place: { type: Object, default: () => ({ latitude: 0, longitude: 0 }) },
  mapHeight: { type: String, default: '55vh' }
})

defineEmits(['close'])
</script>

<template>
<v-card>
  <v-container class="flex-grow-1">
    <div class="position-relative">
      <Map :place="place" :height="mapHeight" />
      <HowToArriveNav :place="place" />
    </div>
    <v-row class="my-4 d-flex flex-column align-center text-center">
      <div class="d-flex ga-2 align-baseline">
        <v-icon icon="mdi-map-marker" size="small" />
        <nuxt-link
          class="text-decoration-none text-h6"
          :to="`/place/${place.id}/${encodeURIComponent(place.name)}`"
        >{{ place.name }}</nuxt-link>
      </div>
      <div class="mx-2">{{ place.address }}</div>
    </v-row>
  </v-container>
  <v-card-actions>
    <v-spacer />
    <v-btn variant="outlined" @click="$emit('close')">{{ $t('common.close') }}</v-btn>
  </v-card-actions>
</v-card>
</template>
