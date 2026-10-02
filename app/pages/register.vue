<script setup>

const settings = useState('settings')
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
    </v-col>
  </v-row>
</v-container>
</template>
