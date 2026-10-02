<script setup lang="ts">
definePageMeta({
  layout: 'clean',
  middleware: ['authenticated']
})

const { user } = useUserSession()
const settings = useState<Settings>('settings')
const route = useRoute()
const { transactionID, client, scope, redirect_uri } = route.query
useHead(() => {
  return { title: `${settings.value.title} - Authorize` }
})
</script>
<template>
<v-form class="d-flex justify-space-around" method="post" action="/oauth/authorize">
  <v-card class="mt-5" max-width="600px">
    <v-card-title>{{settings.title}} - {{$t('common.authorize')}}</v-card-title>
    <v-card-text>
      <h2>{{user?.email}}</h2>
      <input name="transaction_id" :value="transactionID" type="hidden">

      <div>
        <span v-html="$t('oauth.authorization_request', { app: client, instance_name: settings.title })" />
        <ul class="mb-2">
          <li>{{$t(`oauth.scopes.${scope}`)}}</li>
        </ul>
        <span v-html="$t('oauth.redirected_to', {url: redirect_uri})" />
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn color="error" to="/" variant='outlined'>{{$t('common.cancel')}}</v-btn>
      <v-btn type="submit" color="success" variant='outlined'>{{$t('common.authorize')}}</v-btn>
    </v-card-actions>
  </v-card>
</v-form>
</template>
