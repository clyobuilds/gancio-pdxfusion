export default defineNuxtPlugin(async () => {
  const settings = useState<Settings>('settings')

  if (!settings.value) {
    const { data } = await useFetch<Settings>('/api/settings', {
      deep: true
    })
    if (data.value) {
      settings.value = data.value
    }
  }
})