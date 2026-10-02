<script setup>
const loading = ref(false)
definePageMeta({
  middleware: ['authenticated']
})

const { $confirm, $notify } = useNuxtApp()

const { user, clear: clearSession } = useUserSession()

async function forgot () {
  loading.value = true
  await $fetch('/api/user/recover', { method: 'POST', body: { email: user.value.email } })
  loading.value = false
  $notify('login.check_email')
}

async function removeAccount () {
  const ret = await $confirm('settings.remove_account_confirm')
  if (!ret) return
  $fetch('/api/user', { method: 'DELETE' })
  clearSession()
  navigateTo('/')
}

</script>

<template>
<v-container>
  <v-card>
    <v-card-title class="mb-4">{{ user.email }}</v-card-title>
    <v-card-text>
      <div class="text-h6 mb-4">{{ $t('login.forgot_password') }}</div>
      <v-btn variant="outlined" prepend-icon="mdi-email-outline" @click='forgot'>{{ $t('common.recover_password') }}</v-btn>
      <v-divider class='my-6' />
      <div class="text-h6 mb-4 text-error">{{ $t('settings.danger_section') }}</div>
      <v-alert type="error" :icon="false" :border="false" rounded>
        <div class="mb-3">{{ $t('settings.remove_account') }}</div>
        <v-btn variant='outlined' color='error' @click='removeAccount'>{{ $t('common.remove') }}</v-btn>
      </v-alert>
    </v-card-text>
  </v-card>
</v-container>
</template>
