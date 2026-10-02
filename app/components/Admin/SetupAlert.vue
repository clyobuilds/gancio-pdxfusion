<script setup lang="ts">
const settings = useState<Settings>('settings')

const url = useRequestURL().origin
const { data: selfReachable } = await useFetch('/api/utils/reachable')

</script>
<template>
<v-alert v-if='url!==settings.baseurl' rounded="0" flat type='warning' show-icon icon='mdi-alert'>
  <span v-html="$t('admin.wrong_domain_warning', { url, baseurl: settings.baseurl })" />
</v-alert>
<v-alert v-if='!selfReachable' rounded="0" flat type='warning' show-icon icon='mdi-alert'>
  <span v-html="$t('admin.not_reachable_warning', { baseurl: settings.baseurl })" />
</v-alert>
</template>
