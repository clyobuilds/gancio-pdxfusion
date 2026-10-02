<script setup lang="ts">
const props = defineProps({ event: { type: Object, default: () => ({}) } })
const { $notify } = useNuxtApp()
const emit = defineEmits(['close', 'update'])

const loading = ref(false)
const selectedUser = ref()
const { data: users } = await useFetch('/api/users')

async function assign () {
  try {
    loading.value = true
    await $fetch(`/api/events/${props.event.id}/assign_to_author`, { method: 'PUT', body: { userId: selectedUser.value } })
    loading.value = false
    emit('update')
    emit('close')
    $notify('event.saved')
  } catch(e) {
    loading.value = false
    $notify(e, Statuses.ERROR)
  }
}
</script>
<template>
<v-card>
  <v-card-title class="bg-primary">{{$t('event.assign_to_user')}}</v-card-title>
  <v-card-text>
    <p class="mb-2">{{$t('event.assign_to_user_description')}}</p>
    <v-form>
      <v-autocomplete
        v-model='selectedUser'
        :items="users"
        prepend-inner-icon="mdi-account"
        hide-no-data
        item-title="email"
        item-value="id"
        placeholder='Choose user'
        :label="$t('common.user')" />
    </v-form>
  </v-card-text>
  <v-card-actions>
    <v-spacer />
    <v-btn color="primary" variant="outlined" :disabled="!selectedUser || loading" :loading="loading" @click='assign'>{{ $t('event.assign_to_user') }}</v-btn>
    <v-btn color="warning" variant="outlined" @click='$emit("close")'>{{ $t('common.close') }}</v-btn>
  </v-card-actions>
</v-card>
</template>
