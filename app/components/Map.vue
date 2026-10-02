<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import { LMap, LTileLayer, LMarker, LControlAttribution } from '@vue-leaflet/vue-leaflet'
// import { LMap, LTileLayer, LMarker, LPopup, LControlAttribution } from '@vue-leaflet/vue-leaflet'
// import { Icon } from 'leaflet'

const settings = useState<Settings>('settings')
const url = settings.value.tilelayer_provider || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = settings.value.tilelayer_provider_attribution || '<a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors'

const props = defineProps({
  place: { type: Object, default: () => ({ latitude: 0, longitude: 0 }) },
  height: { type: String, default: '10rem' },
  showMarker: { type: Boolean, default: true },
  mapCenter: { type: Array, default: () => ([]) },
  zoom: { type: Number, default: () => (16) },
  draggable: { type: Boolean, default: false }
})

defineEmits(['tileload', 'tileerror'])

const center = computed(() => {
  if (props.mapCenter.length)
    return props.mapCenter
  else {
    const lat = isNaN(props.place.latitude) ? 0 : props.place.latitude
    const lon = isNaN(props.place.longitude) ? 0 : props.place.longitude
    return [lat, lon]
  }
})

const marker = {
  address: props.place.address,
  coordinates: { lat: props.place.latitude, lon: props.place.longitude }
}

// mounted() {
// delete Icon.Default.prototype._getIconUrl;
// Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });

// setTimeout(() => {
//   if (this.$refs.leafletMap && this.$refs.leafletMap.mapObject ) {
//     this.$refs.leafletMap.mapObject.invalidateSize();
//   }
// }, 200);
// },
// methods: {
function updateCoords(v) {
  props.place.latitude = Number.parseFloat(v.lat).toFixed(7)
  props.place.longitude = Number.parseFloat(v.lng).toFixed(7)
}
// }
</script>

<template>
<LMap
  id="leaflet-map"
  ref="leafletMap"
  :use-global-leaflet="false"
  :style="{ height: height || '10rem' }"
  :zoom="zoom"
  :options="{ attributionControl: false }"
  :center="center"
>
  <LControlAttribution position="bottomright" prefix="" />
  <LTileLayer
    :url="url"
    :attribution="attribution"
    @tileload="$emit('tileload')"
    @tileerror="$emit('tileerror')"
  />
  <LMarker
    v-if="showMarker"
    :lat-lng="marker.coordinates"
    :draggable="draggable"
    @update:lat-lng="updateCoords"
  />
</LMap>
</template>

<style>
  #leaflet-map {
    border-radius: 8px;
    z-index: 1;
    background-color: rgb(var(--v-theme-surface));
  }

  .v-theme--dark .leaflet-layer,
  .v-theme--dark .leaflet-control-zoom-in,
  .v-theme--dark .leaflet-control-zoom-out,
  .v-theme--dark .leaflet-control-attribution {
    filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
  }
</style>
