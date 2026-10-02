<script setup lang='ts'>
import type { CreationAttributes } from '@sequelize/core'

const { user } = defineProps<{ user: User }>()
const open = defineModel<boolean>('modelValue')
const valid = ref<boolean>()
const userForm = ref()
const loading = ref(false)
const { $notify } = useNuxtApp()

const { user: loggedUser } = useUserSession()

const emptyUser: CreationAttributes<User> = {
  email: '',
  role: 'user',
  is_active: true,
  to_notify: false,
  description: ''
}
const localUser = ref(user ?? emptyUser)

const emit = defineEmits<{
  'refresh': []
  'update:modelValue': [boolean]
}>()

const isNew = computed(() => typeof user?.id !== 'number')
const isCurrentUser = computed(() => user?.id === loggedUser.value?.id)

async function save () {
  const { valid } = await userForm.value.validate()
  if (!valid) {
    return
  }
  try {
    loading.value = true
    if (isNew.value) {
      await $fetch('/api/user', { method: 'POST', body: localUser.value })
    } else {
      await $fetch(`/api/user/${user.id}`, { method: 'PUT', body: localUser.value })
    }
    $notify('admin.user_update_ok', Statuses.SUCCESS)
    emit('refresh')
    loading.value = false
    userForm.value.reset()
    emit('update:modelValue', false)
  } catch (e) {
    $notify(e, Statuses.ERROR)
    loading.value = false
  }
}

</script>
<template>
<v-dialog v-model="open" :fullscreen="$vuetify.display?.mobile">
  <v-card :loading='loading'>
    <v-card-title class="bg-primary">{{$t(isNew ? 'common.new_user' : 'admin.edit_user')}}</v-card-title>
    <v-card-text>
      <v-form ref="userForm" v-model="valid">
        <v-text-field
          v-if='isNew'
          v-model="localUser.email"
          class="col-4"
          :label="$t('common.email')"
          :rules="$valid.email"
        />
        <h3 v-else>{{localUser.email}}</h3>

        <v-text-field
          v-if='!isNew'
          v-model="localUser.password"
          type='password'
          :label="$t('common.new_password')"
          persistent-hint
          :hint="$t('admin.smtp_password_description')"
        />

        <v-select
          v-model="localUser.role"
          class="col-4"
          clearable
          :rules="[$valid.required('common.role')]"
          :label="$t('common.role')"
          :items="['admin', 'editor', 'user']"
        />

        <v-switch
          v-if='!isNew && !isCurrentUser'
          v-model="localUser.is_active"
          :label="$t('common.enabled')"
          hide-details
        />

        <v-switch
          v-if="localUser.role!=='user'"
          v-model="localUser.to_notify"
          :label="$t('admin.notify')"
          persistent-hint
          :hint="$t('admin.receive_confirm_notification_hint')"
          class="mb-4"
        />

        <v-text-field
          v-model="localUser.description"
          :label="$t('common.description')"
        />
      </v-form>

      <v-alert v-if='isNew' type="info" :closable="false" icon="mdi-information">{{$t('admin.user_add_help')}}</v-alert>
    </v-card-text>
    <v-card-actions>
      <v-spacer/>
      <v-btn color="error" variant='outlined' @click="$emit('update:modelValue', false)">{{$t('common.cancel')}}</v-btn>
      <v-btn :disabled="!valid" color="primary" variant='outlined' @click='save'>{{$t('common.save')}}</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>

</template>
