export const useShowRecurrent = () => {
  const settings = useState<Settings>('settings')
  const showRecurrentCookie = useCookie<boolean>('showRecurrent')
  const showRecurrent = useState<boolean>('showRecurrent', () => settings.value.recurrent_event_visible)
  if (showRecurrentCookie.value !== undefined) {
    showRecurrent.value = showRecurrentCookie.value
  }

  const toggleShowRecurrent = () => {
    showRecurrent.value = !showRecurrent.value
    showRecurrentCookie.value = showRecurrent.value
  }

  return { showRecurrent, toggleShowRecurrent }
}
