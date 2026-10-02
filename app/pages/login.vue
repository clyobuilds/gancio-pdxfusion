<script setup lang="ts">
const { t } = useI18n()
const { fetch: refreshSession } = useUserSession()
const settings = useState<Settings>('settings')
const { $notify } = useNuxtApp()

useHead({
  title: () => `${settings.value.title} - ${t('common.login')}`
})

const credentials = reactive({
  email: '',
  password: ''
})

const valid = ref(false)
const loading = ref(false)

const emailInput = ref()

async function login() {
  $fetch('/api/login', {
    method: 'POST',
    body: credentials
  })
    .then(async () => {
    // refresh the session on client-side and redirect to the home page
      await refreshSession()
      await navigateTo('/')
      $notify('login.ok', Statuses.SUCCESS)
    })
    .catch(() => $notify('login.error', Statuses.ERROR))
}

async function forgot () {
  if (!credentials.email) {
    emailInput.value.focus()
    return
  }
  loading.value = true
  try {
    await $fetch('/api/user/recover', { method: 'POST', body: { email: credentials.email } })
    $notify('login.check_email')
  } catch (e) {
    console.error(e)
    $notify(String(e), Statuses.ERROR)
  }
  loading.value = false
}
</script>
<template>
<v-container class='pa-0 pa-md-3'>
  <v-row class="mt-md-5 ma-0" justify='center'>
    <v-col class='pa-0 pa-md-3' cols='12' md="6" lg="5" xl="4">
      <v-form ref='form' v-model='valid' @submit.prevent='login'>
        <v-card>
          <v-card-title>{{$t('common.login')}}</v-card-title>
          <v-card-subtitle>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="t('login.description')" />
          </v-card-subtitle>
          <v-card-text>
            <v-text-field
              ref="emailInput"
              v-model='credentials.email'
              validate-on="blur"
              :rules='$valid.email'
              autofocus
              :label='$t("common.email")'
            />

            <v-text-field
              v-model='credentials.password'
              :rules='[$valid.password]'
              type='password' :label='$t("common.password")' />
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" tabindex="1" size="small" @click='forgot'>{{$t('login.forgot_password')}}</v-btn>
          </v-card-actions>

          <v-card-actions>
            <v-spacer/>
            <v-btn v-if='settings?.allow_registration' to='/register' variant="text" color='orange'>{{$t('login.not_registered')}}</v-btn>
            <v-btn color='success' type='submit' variant='outlined' :disabled='!valid || loading' :loading='loading'>{{$t('common.login')}}</v-btn>
          </v-card-actions>
        </v-card>

      </v-form>
    </v-col>
  </v-row>
</v-container>
</template>
