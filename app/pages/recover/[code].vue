<script setup lang='ts'>
const { t } = useI18n()
const route = useRoute()
const settings = useState<Settings>('settings')

useHead({ title: `${settings.value.title} - ${t('common.recover_password')}` })

const recoverCode = route.params.code
const newPassword = ref('')
const valid = ref(false)

const user = await $fetch('/api/user/check_recover_code', {
  method: 'POST',
  body: { recover_code: recoverCode }
}).catch(() => {})
const { $notify } = useNuxtApp()

async function changePassword () {
  try {
    await $fetch('/api/user/recover_password', {
      method: 'POST',
      body: { recover_code: recoverCode, password: newPassword.value }
    })
    $notify('common.password_updated')
    navigateTo('/login')
  } catch (e) {
    $notify(e, Statuses.WARNING)
  }
}
</script>
<template>
<v-container>
  <v-form v-model='valid' @submit.prevent="changePassword">
    <v-row class='mt-5' align='center' justify='center'>
      <v-col cols='12' md="6" lg="5" xl="4">
        <v-card>
          <v-card-title>{{$t('common.recover_password')}}</v-card-title>
          <template v-if='user'>
            <v-card-subtitle>{{user.email}}</v-card-subtitle>
            <v-card-text>
              <v-text-field
                v-model='newPassword'
                type='password'
                :rules="[$valid.password]" autofocus
                :placeholder='$t("common.new_password")' />
            </v-card-text>
          </template>
          <template v-else>
            <v-card-text>
              <v-alert type='error' icon='mdi-alert'>{{$t('recover.not_valid_code')}}</v-alert>
            </v-card-text>
          </template>

          <v-card-actions>
            <v-spacer />
            <v-btn v-if='user' variant='outlined' color='primary' type='submit' :disabled='!valid'>{{$t('common.send')}}</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-form>
</v-container>
</template>
