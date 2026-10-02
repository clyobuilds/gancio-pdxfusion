<script setup lang="ts">
definePageMeta({ middleware: ['authenticated'] })
const { t } = useI18n()
const { data: events, refresh } = await useFetch('/api/events/mine')
const { $confirm, $notify } = useNuxtApp()
const time = useTime()

const search = ref('')

const headers = [
  { value: 'title', title: t('common.title') },
  { value: 'place.name', title: t('common.place') },
  { value: 'start_datetime', title: t('common.when') },
  { value: 'actions', title: t('common.actions'), align: 'end', sortable: false, width: 250 }
]

async function toggle (event) {
  const id = event.id
  try {
    await $fetch(`/api/events/${id}/toggle`, { method: 'PUT' })
    refresh()
  } catch (e) {
    console.error(e)
  }
}

async function remove (event: EventAPI, parent) {
  const ret = await $confirm(`event.remove_${parent ? 'recurrent_' : ''}confirmation`, { event: event.title })
  if (!ret) {
    return
  }
  await $fetch(`/api/events/${event.id}`, { method: 'DELETE' })
  refresh()
  $notify('admin.event_remove_ok')
}
</script>

<template>
<v-container>
  <v-card>
    <v-card-title>{{$t('common.my_events')}}</v-card-title>
    <v-card-text class="pa-1 pa-md-3">
      <v-text-field v-model="search" :label="$t('common.search')"/>
      <v-data-table
        v-if='events'
        :items="events" :hide-default-footer='events?.length<10' density="compact" :search="search"
        :headers='headers'>
        <template v-slot:item.start_datetime='{ item }'>
          <span v-if='!item.recurrent'>{{time.when(item)}}</span>
          <!-- <span v-else><v-icon color='success' v-text='mdiRepeat' /> {{time.recurrentDetail({ parent: item }, 'EEEE, HH:mm')}}</span>  -->
        </template>
        <template v-slot:item.actions='{ item }'>
          <template v-if="!item.recurrent">
            <t-btn v-if='!item.is_visible' color='success' tooltip="common.confirm" icon='mdi-eye' @click='toggle(item)' />
            <t-btn v-else-if="!item.parentId" color='info' tooltip="common.hide" icon='mdi-eye-off' @click='toggle(item)' />
            <t-btn v-else color='info' tooltip="common.skip" icon='mdi-debug-step-over' @click='toggle(item)' />
            <t-btn :to='`/event/${item.slug || item.id}`' tooltip="common.preview" icon='mdi-arrow-right' />
          </template>
          <template v-else>
            <t-btn v-if='!item.is_visible' color='success' tooltip="common.start" icon='mdi-play' @click='toggle(item)' />
            <t-btn v-else color='info' tooltip="common.pause" icon='mdi-pause' @click='toggle(item)' />
          </template>
          <t-btn :to='`/add/${item.id}`' color='yellow' tooltip="common.edit" icon='mdi-pencil' />
          <t-btn color='error' tooltip="common.delete" :icon="item.recurrent ? 'mdi-delete-forever' : 'mdi-delete'" @click='remove(item, item.recurrent)' />
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</v-container>
</template>
