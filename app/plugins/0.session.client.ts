// copied from nuxt-auth-utils
export default defineNuxtPlugin(async (nuxtApp: any) => {
  if (!nuxtApp.payload.serverRendered) {
    await useUserSession().fetch()
  }
  else if (Boolean(nuxtApp.payload.prerenderedAt) || Boolean(nuxtApp.payload.isCached)) {
    // To avoid hydration mismatch
    nuxtApp.hook('app:suspense:resolve', async () => {
      await useUserSession().fetch()
    })
  }
})