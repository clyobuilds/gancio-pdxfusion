<script setup lang="ts">
const { t } = useI18n()
const { $notify, $confirm } = useNuxtApp()

const valid = ref(false)
const dialog = ref(false)
const editing = ref(false)
const form = ref()

const loading = ref(false)
const announcement = reactive<AnnouncementAPI>({ title: '', announcement: '', visible: false })
const headers = [
  { value: 'title', title: t('common.title') },
  { value: 'actions', title: t('common.actions'), align: 'end', sortable: false }
]

const { data: announcements, refresh } = await useFetch<Announcement[]>('/api/announcements/list')

function edit(newAnnouncement: Announcement) {
  announcement.title = newAnnouncement.title
  announcement.announcement = newAnnouncement.announcement
  announcement.id = newAnnouncement.id
  editing.value = true
  dialog.value = true
}

function openDialog() {
  // form.value.reset()
  editing.value = false
  announcement.title = ''
  announcement.announcement = ''
  dialog.value = true
}

async function toggle(announcement: Announcement) {
  try {
    announcement.visible = !announcement.visible
    await $fetch(`/api/announcements/${announcement.id}`, { method: 'PUT', body: announcement })
    refresh()
  } catch (e) {
    console.error(e)
  }
}

async function remove(announcement: Announcement) {
  const ret = await $confirm('admin.delete_announcement_confirm')
  if (!ret) {
    return
  }
  await $fetch(`/api/announcements/${announcement.id}`, { method: 'DELETE' })
  $notify('admin.announcement_remove_ok')
  refresh()
}

async function save() {
  const { valid } = await form.value.validate()
  if (!valid) {
    return
  }
  loading.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/announcements/${announcement.id}`, { method: 'PUT', body: announcement })
    } else {
      await $fetch('/api/announcements', { method: 'POST', body: announcement })
    }
    refresh()
    form.value.reset()
    editing.value = false
    dialog.value = false
  } catch (e) {
    $notify(String(e), Statuses.ERROR)
  }
  loading.value = false
}
</script>

<template>
<div class="d-flex flex-column ga-2">
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="text-subtitle-2 text-medium-emphasis" v-html="t('admin.announcement_description')" />

  <v-dialog v-model='dialog' width='800px' :fullscreen='$vuetify.display?.mobile'>
    <v-card>
      <v-card-title> {{ t('admin.new_announcement') }}</v-card-title>
      <v-card-text class='px-0'>
        <v-form ref='form' v-model='valid' validate-on="lazy" @submit.prevent='save'>
          <v-text-field
            v-model='announcement.title' class='v-col-12'
            :rules="[$valid.required('common.title')]"
            :label='t("common.title")' />
          <CoreEditor
            v-model='announcement.announcement' class='v-col-12' label="Content"
            border no-save max-height='400px' :placeholder="t('common.description')" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color='error' variant='outlined' @click='dialog = false'> {{ t('common.cancel') }}</v-btn>
        <v-btn color='primary' :disabled='!valid || loading' :loading='loading' variant='outlined' @click='save'> {{ t(`common.${editing ? 'save' : 'send'}`) }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <div class="d-flex justify-end">
    <v-btn variant='text' color='primary' prepend-icon='mdi-plus' @click='openDialog'> {{ t('common.add') }}</v-btn>
  </div>

  <div class="mt-2">
    <v-data-table
      v-if='announcements'
      :hide-default-footer='announcements.length<10'
      :headers='headers'
      :items='announcements'>
      <template v-slot:item.actions='{ item }'>
        <t-btn
          :color='item.visible ? "warning" : "success"'
          :tooltip="item.visible ? t('common.disable') : t('common.enable')"
          :icon="item.visible ? 'mdi-eye-off' : 'mdi-eye'"
          @click='toggle(item)' />
        <t-btn color='info' :tooltip="t('common.edit')" icon='mdi-pencil' @click='edit(item)' />
        <t-btn color='error' :tooltip="t('common.delete')" icon='mdi-delete-forever' @click='remove(item)' />
      </template>
    </v-data-table>
  </div>
</div>
</template>
