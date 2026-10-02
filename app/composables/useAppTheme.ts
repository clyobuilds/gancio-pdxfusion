import { useTheme } from 'vuetify'

export const useAppTheme = () => {
  const theme = useTheme()
  const cookie = useCookie<'light' | 'dark' | 'system'>('theme')

  const toggleTheme = () => {
    const newTheme = theme.global.current.value.dark ? 'light' : 'dark'
    theme.change(newTheme)
    cookie.value = newTheme
  }

  return { theme, toggleTheme }
}
