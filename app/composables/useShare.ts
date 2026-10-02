/**
 * Returns a function that triggers the system's native share dialog
 * if it's supported.
 */
export default function useShare() {
  const canShare = ref(false)
  onMounted(() => {
    canShare.value = navigator?.canShare?.({ url: '' }) || false
  })

  return computed(() => canShare.value ? openShare : undefined)
}

const openShare = (data: ShareData = {
  title: document?.title,
  url: window.location.toString()
}) => {
  try {
    navigator?.share?.(data)
  } catch { /* ignore */ }
}
