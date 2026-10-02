export default defineNuxtPlugin(() => {
  const copyToClipboard = async (text: string) => {
    const { $notify } = useNuxtApp()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // legacy
      const el = document.createElement('textarea')
      el.addEventListener('focusin', e => e.stopPropagation())
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    $notify('common.copied')
  }

  return { provide: { copyToClipboard } }
})
