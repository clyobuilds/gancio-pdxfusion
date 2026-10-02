import { useData } from 'vitepress'
import { onMounted, watch } from 'vue'
import { useTheme } from 'vuetify'

// Synchronize vitepress and vuetify themes
export default function useSynchronizeThemes() {
  const { isDark } = useData()
  const vuetifyTheme = useTheme()
  const syncTheme = () => vuetifyTheme.change(isDark.value ? 'dark' : 'light')
  onMounted(syncTheme)
  watch(isDark, syncTheme, { immediate: false })
}
