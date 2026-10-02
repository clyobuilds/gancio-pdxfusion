<script setup lang="ts">

const { $notify } = useNuxtApp()
const { isAdmin } = useAuth()
const { t } = useI18n()
const { data } = await useFetch<string>('/api/settings/about')
const about = ref(data || t('about'))
const settings = useState<Settings>('settings')

useHead({
  title: settings.value?.title + ' - ' + t('common.about'),
  meta: [
    { name: 'description', content: about.value }
  ]
})

function save() {
  $notify('common.ok', Statuses.SUCCESS)
  $fetch('/api/settings', { method: 'PUT', body: { key: 'about', value: about.value } })
}
</script>
<template>
<v-container>
  <v-card-text v-if='isAdmin'>
    <CoreEditor v-model='about' class='px-3 ma-0' :label="t('common.about')" height='500px' />
  </v-card-text>
  <span v-else v-html='about' />
  <v-card-actions v-if='isAdmin'>
    <v-spacer />
    <v-btn color='primary' variant='outlined' @click='save'> {{t('common.save')}}</v-btn>
  </v-card-actions>
</v-container>
</template>
