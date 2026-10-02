<script setup lang="ts">

const { $notify } = useNuxtApp()
const route = useRoute()
const recover_code = route.params.code

const new_password = ref('')
const form = ref()

async function change_password() {
  const valid = await form.value.validate()
  if (!valid) {
    return
  }
  try {
    await $fetch('/api/user/recover_password', { method: 'POST', body: { recover_code, password: new_password.value } })
    $notify('common.password_updated', Statuses.SUCCESS)
    navigateTo('/login')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

const { data: user, error } = await useFetch('/api/user/check_recover_code', { method: 'POST', body: { recover_code } })
</script>
<template>
<v-container>
  <v-row class='mt-5' align='center' justify='center'>
    <v-col cols='12' md="6" lg="5" xl="4">
      <v-form ref='form' @submit.prevent='change_password'>
        <v-card>
          <v-card-title>{{$t('common.set_password')}}</v-card-title>
          <template v-if='user'>
            <v-card-subtitle>{{user.email}}</v-card-subtitle>
            <v-card-text>
              <v-text-field v-model='new_password' type='password' :label="$t('common.new_password')" :rules='[$valid.password]' autofocus />
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn color="primary" type='submit' :disabled='!new_password' variant="outlined"> {{$t('common.send')}}</v-btn>
            </v-card-actions>
          </template>
          <v-card-text v-else>
            <v-alert ma-5 type='error' icon='mdi-alert'> {{$t('recover.not_valid_code')}} <br> {{ error }}</v-alert>
          </v-card-text>
        </v-card>
      </v-form>
    </v-col>
  </v-row>
</v-container>
</template>
