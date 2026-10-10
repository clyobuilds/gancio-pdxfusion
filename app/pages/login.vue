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

// log in with a code sent by e-mail (no password): this card has its own e-mail field
const codeStep = ref(false)
const code = ref('')
const codeEmail = ref('')
const codeEmailInput = ref()

async function sendCode () {
  if (!codeEmail.value) {
    codeEmailInput.value.focus()
    return
  }
  loading.value = true
  try {
    await $fetch('/api/login/code/request', { method: 'POST', body: { email: codeEmail.value } })
    codeStep.value = true
    $notify('login.check_email')
  } catch (e) {
    console.error(e)
    $notify(String(e), Statuses.ERROR)
  }
  loading.value = false
}

async function loginWithCode () {
  try {
    await $fetch('/api/login/code/verify', { method: 'POST', body: { email: codeEmail.value, code: code.value } })
    await refreshSession()
    await navigateTo('/')
    $notify('login.ok', Statuses.SUCCESS)
  } catch (e) {
    code.value = ''
    $notify('login.code_error', Statuses.ERROR)
  }
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
            <v-spacer/>
            <v-btn color='success' type='submit' variant='outlined' :disabled='!valid || loading' :loading='loading'>{{$t('common.login')}}</v-btn>
          </v-card-actions>
        </v-card>

      </v-form>

      <v-card class='mt-4'>
        <v-card-title>{{ $t('login.code_title') }}</v-card-title>
        <v-card-subtitle>{{ $t('login.code_description') }}</v-card-subtitle>
        <v-card-text>
          <v-text-field
            ref='codeEmailInput'
            v-model='codeEmail'
            :disabled='codeStep'
            :rules='$valid.email'
            :label='$t("common.email")'
            type='email'
            autocomplete='email'
            @keyup.enter='sendCode'
          />
          <v-text-field
            v-if='codeStep'
            v-model='code'
            :label='$t("login.code_label")'
            inputmode='numeric'
            autocomplete='one-time-code'
            maxlength='6'
            @keyup.enter='loginWithCode'
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn v-if='!codeStep' color='primary' variant='outlined' :disabled='loading' :loading='loading' @click='sendCode'>{{ $t('login.code_send') }}</v-btn>
          <v-btn v-else color='success' variant='outlined' :disabled='code.length !== 6' @click='loginWithCode'>{{ $t('login.code_submit') }}</v-btn>
        </v-card-actions>
      </v-card>

      <div v-if='settings?.allow_registration' class='text-center mt-6'>
        <span class='text-medium-emphasis'>{{ $t('login.need_account') }}</span>
        <v-btn to='/register' variant='text' color='orange'>{{ $t('login.not_registered') }}</v-btn>
      </div>
    </v-col>
  </v-row>
</v-container>
</template>
