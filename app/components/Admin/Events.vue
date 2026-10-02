<script setup lang="ts">
defineProps({
  unconfirmedEvents: { type: Array, default: () => [] },
  unconfirmedOldEvents: { type: Array, default: () => [] }
})

const emit = defineEmits(['confirmed', 'removed'])
const settings = useState<Settings>('settings')

const { $confirm, $notify } = useNuxtApp()
const $route = useRoute()
const { t } = useI18n()

const openModeration = ref($route?.query?.moderation ? true : false)
const selectedEvent = ref()
const time = useTime()

const headers = [
  { value: 'title', title: t('common.title') },
  { value: 'place.name', title: t('common.place') },
  { value: 'start_datetime', title: t('common.when') },
  { value: 'actions', title: t('common.actions'), align: 'end', sortable: false, width: 280 }
]

async function confirm (event) {
  try {
    await $fetch(`/api/events/${event.id}/toggle`, { method: 'PUT' })
    emit('confirmed', event.id)
    $notify('event.confirmed')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function remove (event) {
  const ret = await $confirm('event.remove_confirmation', { event: event.title })
  if (!ret) {
    return
  }
  try {
    await $fetch(`/api/events/${event.id}`, { method: 'DELETE' })
    $notify('admin.event_remove_ok')
    emit('removed', event.id)
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}
</script>

<template>
<div>
  <div class="text-subtitle-2 text-medium-emphasis">{{$t('admin.event_confirm_description')}}</div>
  <v-data-table
    v-if='unconfirmedEvents.length'
    :hide-default-footer='unconfirmedEvents.length<10'
    :items='unconfirmedEvents'
    :headers='headers'
  >
    <template v-slot:item.start_datetime='{ item }'>{{time.when(item)}}</template>

    <template v-slot:item.actions='{ item }'>
      <t-btn color='success' :tooltip="$t('common.confirm')" icon='mdi-check-bold' @click='confirm(item)' />

      <t-btn
        v-if='settings.enable_moderation'
        color='warning'
        :tooltip="$t('common.moderation')" icon='mdi-message-text' @click='() => { selectedEvent = item; openModeration=true }' />
      <!-- v-badge(v-if='item?.n_messages' :content="item?.n_messages" overlap bordered)
          v-icon(v-text='mdiMessageText')
        v-icon(v-else v-text='mdiMessageText')  -->

      <t-btn :to='`/event/${item.slug || item.id}`' color='info' :tooltip="$t('common.preview')" icon='mdi-eye' />

      <t-btn :to='`/add/${item.id}`' color='warning' :tooltip="$t('common.edit')" icon='mdi-pencil' />

      <t-btn color='error' :tooltip="$t('common.delete')" icon='mdi-delete-forever' @click='remove(item)' />
    </template>
  </v-data-table>

  <v-card-title v-if='unconfirmedOldEvents.length'>{{$t('common.past_events')}}</v-card-title>
  <v-data-table
    v-if='unconfirmedOldEvents.length'
    :hide-default-footer='unconfirmedOldEvents.length<10'
    :items='unconfirmedOldEvents'
    :headers='headers'
  >
    <template v-slot:item.start_datetime='{ item }'> {{time.when(item)}} </template>
    <template v-slot:item.actions='{ item }'>
      <t-btn :to='`/event/${item.slug || item.id}`' color='info' :tooltip="$t('common.preview')" icon='mdi-arrow-right' />
      <t-btn :to='`/add/${item.id}`' color='warning' :tooltip="$t('common.edit')" icon='mdi-pencil' />
      <t-btn color='error' :tooltip="$t('common.delete')" icon='mdi-delete-forever' @click='remove(item)' />
    </template>
  </v-data-table>
  <v-navigation-drawer
    v-model="openModeration"
    :fullscreen="$vuetify.display?.mobile"
    location='right'
    width="400"
    temporary
  >
    <LazyEventModeration
      v-if="openModeration"
      :event="selectedEvent"
      @close="openModeration=false"
    />
  </v-navigation-drawer>
</div>

</template>
