<script setup lang="ts">

const props = defineProps({
  place: { type: Object, default: () => ({ latitude: 0, longitude: 0 }) }
})

function routeBy (type: 'foot' | 'bike' | 'car' | 'transit') {
  const lat = props.place.latitude
  const lon = props.place.longitude
  const routingType = {
    foot: 'engine=fossgis_osrm_foot',
    bike: 'engine=fossgis_osrm_bike',
    car: 'engine=fossgis_osrm_car',
    transit: null
  }
  return `https://www.openstreetmap.org/directions?from=&to=${lat},${lon}&${routingType[type]}#map=14/${lat}/${lon}`
}
const geoUrl = computed(() => `geo:${props.place.latitude},${props.place.longitude}?q=${props.place.name}`)
</script>

<template>
<div class="how-to-arrive d-flex ga-n2 ma-3 rounded-xl position-absolute bottom-0">
  <v-btn variant="text" size="small" icon='mdi-walk' :href="routeBy('foot')" />
  <v-btn variant="text" size="small" icon='mdi-bike' :href="routeBy('bike')" />
  <v-btn variant="text" size="small" icon='mdi-car' :href="routeBy('car')" />
  <v-btn variant="text" size="small" icon='mdi-open-in-new' :href="geoUrl" />
</div>
</template>
<style lang="css" scoped>
.how-to-arrive {
  z-index: 1;
  inset-inline-start: 0;
  background: rgb(var(--v-theme-background));
  box-shadow: 0 0 0 2px rgba(0,0,0,.2); /* mimick other leaflet buttons */
}
</style>
