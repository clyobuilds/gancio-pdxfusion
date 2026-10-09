<script setup>

const settings = useState('settings')
const { fetch: refreshSession } = useUserSession()
const { t } = useI18n()
useHead({
  title: `${settings.value.title} - ${t('common.register')}`
})

const form = ref()
const email = ref()
const loading = ref(false)
const user = reactive({ email: '', password: '', description: '' })
const valid = ref(false)
const { $notify } = useNuxtApp()

const register = async () => {
  const valid = await form.value.validate()
  if (!valid) {
    return
  }
  try {
    loading.value = true
    const createdUser = await $fetch('/api/user/register', { method: 'POST', body: user })
    // this is the first user registered
    const isFirstUser = createdUser && createdUser.role === 'admin' && createdUser.is_active
    $notify(isFirstUser ? 'register.first_user' : 'register.complete')
    navigateTo('/')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
  loading.value = false
}

// sign up with an e-mail code (no password): the account waits for approval, like the form above
const codeStep = ref(false)
const codeEmail = ref('')
const codeEmailInput = ref()
const code = ref('')
const codeLoading = ref(false)

async function sendSignupCode () {
  if (!codeEmail.value) {
    codeEmailInput.value.focus()
    return
  }
  codeLoading.value = true
  try {
    await $fetch('/api/login/code/request', { method: 'POST', body: { email: codeEmail.value, register: true } })
    codeStep.value = true
    $notify('login.check_email')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
  codeLoading.value = false
}

async function signupWithCode () {
  codeLoading.value = true
  try {
    const result = await $fetch('/api/login/code/verify', {
      method: 'POST',
      body: { email: codeEmail.value, code: code.value, register: true }
    })
    if (result.pending) {
      $notify('register.complete')
      navigateTo('/')
    } else {
      // the first account on a new site: already an active admin
      await refreshSession()
      $notify('register.first_user')
      navigateTo('/')
    }
  } catch (e) {
    code.value = ''
    $notify('login.code_error', Statuses.ERROR)
  }
  codeLoading.value = false
}
</script>
<template>
<v-container class="pa-0 pa-md-3">
  <v-row class="mt-md-5 ma-0" align="center" justify="center">
    <v-col class="pa-0 pa-md-3" cols="12" md="6" lg="5" xl="4">
      <v-form ref="form" v-model="valid" @submit.prevent="register">
        <v-card>
          <v-card-title>{{ $t("common.register") }}</v-card-title>

          <v-card-text>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p v-html="$t('register.description')" />
            <v-text-field
              ref="email" v-model="user.email" type="email" :rules="$valid.email"
              :label="$t('common.email')" autocomplete="email" />

            <v-text-field
              v-model="user.password" type="password" :rules="[$valid.password]"
              :label="$t('common.password')" />

            <v-textarea
              v-model="user.description" :rules="[$valid.required($t('common.description'))]"
              :label="$t('common.description')" />
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn
              type="submit" variant="outlined"  append-icon="mdi-chevron-right" :disabled="!valid || loading" :loading="loading"
              color="primary">{{ $t("common.send") }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-form>

      <v-card v-if='settings?.allow_registration' class='mt-4'>
        <v-card-title>{{ $t('register.code_title') }}</v-card-title>
        <v-card-subtitle>{{ $t('register.code_description') }}</v-card-subtitle>
        <v-card-text>
          <v-text-field
            ref='codeEmailInput'
            v-model='codeEmail'
            :disabled='codeStep'
            :rules='$valid.email'
            :label='$t("common.email")'
            type='email'
            autocomplete='email'
          />
          <v-text-field
            v-if='codeStep'
            v-model='code'
            :label='$t("login.code_label")'
            inputmode='numeric'
            autocomplete='one-time-code'
            maxlength='6'
            @keyup.enter='signupWithCode'
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn v-if='!codeStep' color='primary' variant='outlined' :disabled='codeLoading' :loading='codeLoading' @click='sendSignupCode'>{{ $t('login.code_send') }}</v-btn>
          <v-btn v-else color='success' variant='outlined' :disabled='code.length !== 6 || codeLoading' :loading='codeLoading' @click='signupWithCode'>{{ $t('register.code_submit') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</v-container>
</template>
