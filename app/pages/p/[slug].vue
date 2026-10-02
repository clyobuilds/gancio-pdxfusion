<script setup lang="ts">

const { $notify } = useNuxtApp()
const settings = useState<Settings>('settings')

const route = useRoute()
const { data: page, refresh } = await useFetch<Page>(`/api/pages/${route.params.slug}`)

if (!page.value) {
  throw createError({ status: 404, statusMessage: 'Page not found' })
}

useHead(() => {
  const title = `${settings.value.title} - ${page.value?.title}`
  return {
    title
  }
})

async function toggleVisibility() {
  if (!page.value) {
    return
  }

  try {
    await $fetch(`/api/pages/${page.value.id}`, {
      method: 'PUT',
      body: { ...page.value, visible: true }
    })
    refresh()
    $notify($t('common.enabled'))
  } catch (e) {
    $notify(String(e))
  }
}

</script>
<template>
<v-container>
  <v-alert v-if="!page?.visible" type="warning" rounded class="mb-4">
    <span class="font-weight-semibold">{{ $t('admin.page_is_disabled')}}</span>
    <template #append>
      <v-btn color="warning" @click="toggleVisibility">{{ $t('common.enable') }}</v-btn>
    </template>
  </v-alert>
  <v-card>
    <v-card-title class='text-h4 font-weight-bold'>{{ page?.title }}</v-card-title>
    <v-card-text v-html='page?.content' />
  </v-card>
</v-container>
</template>
