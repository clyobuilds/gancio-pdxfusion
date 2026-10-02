<script setup lang="ts">
import type { EventStatus } from '~~/server/services/db'

const { event } = defineProps<{ event: EventAPI }>()
const emit = defineEmits(['update', 'openModeration', 'openAssignAuthor'])
const settings = useState<Settings>('settings')
const { isAdmin } = useAuth()
const { $confirm, $notify } = useNuxtApp()

async function disableAuthor() {
  const ret = await $confirm('event.disable_author_confirm')
  if (!ret) {
    return
  }
  try {
    await $fetch(`/api/events/${event.id}/disable_author`, { method: 'PUT' })
    $notify('Author disabled!', Statuses.SUCCESS)
    emit('update')
    // event.is_anon = true
  } catch (e) {
    $notify(e, Statuses.WARNING)
  }
}

async function remove(parent = false) {
  const ret = await $confirm(`event.remove_${parent ? 'recurrent_' : ''}confirmation`, { event: event?.title })
  if (!ret) {
    return
  }
  const id = parent ? event.parentId : event.id
  try {
    await $fetch(`/api/events/${id}`, { method: 'DELETE' })
  } catch (e) {
    $notify(String(e), Statuses.ERROR)
  }
  navigateTo('/')
}

async function toggle(parent = false) {
  const id = parent ? event.parentId : event.id
  try {
    await $fetch(`/api/events/${id}/toggle`, { method: 'PUT' })
    emit('update')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

const isScheduled = computed(() => event.status === 'EventScheduled')
async function updateStatus(status: EventStatus) {
  const ret = await $confirm('event.cancel_description')
  if (!ret) return
  try {
    await $fetch(`/api/events/${event.id}`, { method: 'PATCH', body: { status } })
    emit('update')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function reannounce() {
  const id = event.id
  const ret = await $confirm('event.reannounce_description', { event: event?.title })
  if (!ret) {
    return
  }
  try {
    await $fetch(`/api/events/${id}/reannounce`, { method: 'PUT' })
    emit('update')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

</script>

<template>
<v-list>
  <v-divider>{{ $t('common.admin_actions') }}</v-divider>

  <!-- Hide / confirm event -->
  <v-list-item
    :prepend-icon="event?.is_visible ?? false ? 'mdi-eye-off' : 'mdi-eye'"
    :title="$t(`common.${event.is_visible ? (event.parentId ? 'skip' : 'hide') : 'confirm'}`)"
    @click="toggle(false)" />

  <v-list-item
    v-if="isScheduled"
    prepend-icon="mdi-calendar-remove"
    :title="$t('common.cancel')"
    @click="updateStatus('EventCancelled')" />

  <!-- Edit event -->
  <v-list-item :to="`/add/${event.id}`" prepend-icon='mdi-calendar-edit' :title="$t('common.edit')" />

  <!-- Clone -->
  <v-list-item
    v-if="!event.parentId" :to="`/add/${event.id}?clone=true`" prepend-icon='mdi-scanner'
    :title="$t('common.clone')" />

  <!-- Remove -->
  <v-list-item v-if="!event.parentId" prepend-icon='mdi-delete' :title="$t('common.remove')" @click="remove(false)" />

  <!-- Moderation -->
  <v-list-item
    v-if="settings.enable_moderation" prepend-icon='mdi-message-text-outline'
    :title="$t('common.moderation')" @click="$emit('openModeration')">
    <!-- <template v-if="event?.n_messages" #append-icon> -->
    <!--   <v-chip size='small' label class="bg-primary">{{ event?.n_messages }}</v-chip> -->
    <!-- </template> -->
  </v-list-item>

  <!-- Disable author -->
  <v-list-item
    v-if="settings.enable_moderation && !event.is_anon && isAdmin" prepend-icon='mdi-account-off'
    :title="$t('event.disable_author')" @click="disableAuthor" />

  <!-- Assign to user -->
  <v-list-item
    v-if="event.is_anon && isAdmin"
    prepend-icon='mdi-clipboard-account'
    :title="$t('event.assign_to_user')" @click="$emit('openAssignAuthor')" />

  <!-- Re-announce event -->
  <v-list-item
    v-if="settings.enable_federation && isAdmin" prepend-icon='mdi-replay' :title="$t('event.reannounce')"
    @click="reannounce" />

  <!-- Recurring events -->
  <template v-if="event.parentId">

    <v-list-item class="text-overline">
      <span v-text="$t('common.recurring_event_actions')" />
    </v-list-item>

    <!-- Pause / Start to generate recurring event -->
    <!-- <v-list-item :prepend-icon="event.parent.is_visible ? 'mdi-pause' : 'mdi-play'" -->
    <!--   :title="$t(`common.${event.parent.is_visible ? 'pause' : 'start'}`)" @click="toggle(true)" /> -->

    <!-- Edit event -->
    <v-list-item :to="`/add/${event.parentId}`" prepend-icon='mdi-calendar-edit' :title="$t('common.edit')" />

    <!-- Remove -->
    <v-list-item prepend-icon='mdi-delete-forever' :title="$t('common.remove')" @click="remove(true)" />

  </template>
  <!-- </v-list-group> -->
</v-list>
</template>
