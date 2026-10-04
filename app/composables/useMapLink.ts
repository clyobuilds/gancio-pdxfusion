// A link that opens a place in the visitor's own maps app: Apple Maps on iPhone/iPad, the default
// maps app on Android (geo: link), OpenStreetMap elsewhere (also what the server renders).
export function useMapLink(place: () => { latitude?: number | string | null, longitude?: number | string | null, name?: string }) {
  const platform = ref<'ios' | 'android' | 'other'>('other')
  onMounted(() => {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      platform.value = 'ios'
    } else if (/Android/.test(ua)) {
      platform.value = 'android'
    }
  })
  return computed(() => {
    const p = place()
    const ll = `${p.latitude},${p.longitude}`
    const name = encodeURIComponent(p.name ?? '')
    if (platform.value === 'ios') {
      return `https://maps.apple.com/?ll=${ll}&q=${name}`
    }
    if (platform.value === 'android') {
      return `geo:${ll}?q=${ll}(${name})`
    }
    return `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`
  })
}
