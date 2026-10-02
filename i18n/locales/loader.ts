const cache = new Map()

export default defineI18nLocale(async (locale) => {
  if (cache.has(locale)) return cache.get(locale)

  const messages = await $fetch(`/api/locale/${locale}`)
  cache.set(locale, messages)
  return messages
})
