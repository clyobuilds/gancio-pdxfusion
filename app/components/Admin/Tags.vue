<script setup>
const { t } = useI18n()
const { $notify, $confirm } = useNuxtApp()

const loading = ref(false)
const dialog = ref(false)
const valid = ref(false)
const tag = ref({})
const newTag = ref('')
const search = ref('')
const form = ref(false)
const headers = [
  { value: 'tag', title: t('common.tag') },
  { value: 'count', title: 'N.' },
  { value: 'actions', title: t('common.actions'), align: 'end' }
]

const { data: tags, refresh } = await useFetch('/api/tags/list')

function editTag(item) {
  tag.value.tag = item.tag
  tag.value.count = item.count
  dialog.value = true
}

async function saveTag () {
  loading.value = true
  const { valid } = await form.value.validate()
  if (!valid) {
    return
  }

  await $fetch('/api/tags', { method: 'PUT', body: { tag: tag.value.tag, newTag: newTag.value } })
  dialog.value = false
  refresh()
  loading.value = false
  $notify('admin.tag_renamed', Statuses.SUCCESS, { oldTag: tag.value.tag, newTag: newTag.value })
  newTag.value = ''
}

async function removeTag (tag) {
  const ret = await $confirm('admin.delete_tag_confirm', { tag: tag.tag, n: tag.count })
  if (!ret) {
    return
  }
  try {
    $fetch(`/api/tags`, { method: 'DELETE', body: { tag: tag.tag } })
    refresh()
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}
</script>

<template>
<div class="d-flex flex-column ga-2 mt-4">
  <div class="d-flex justify-end">
    <CoreSearchInput v-model="search" class="w-100 w-sm-25"/>
  </div>

  <v-dialog v-if='dialog' v-model='dialog' width='600' :fullscreen='$vuetify.display?.mobile'>
    <v-card>
      <v-card-title> {{$t('admin.edit_tag')}} -
        <strong class='ml-2'> {{tag.tag}}</strong>
      </v-card-title>
      <v-card-subtitle> {{$t('admin.edit_tag_help', tag.count)}}</v-card-subtitle>
      <v-card-text>
        <v-form ref='form' v-model='valid'>
          <v-combobox
            v-model='newTag'
            v-model:search="newTag"
            prepend-icon="mdi-tag"
            hide-no-data
            persistent-hint
            :items="tags"
            :return-object='false'
            item-value='tag'
            item-title='tag'
            :label="$t('common.tag')"
            @keyup.enter='saveTag'>
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #title>
                  "{{item.raw.tag}}" <small>({{item.raw.count}})</small>
                </template>
              </v-list-item>
            </template>
          </v-combobox>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant='outlined' color='warning' @click='dialog = false'> {{ $t('common.cancel') }}</v-btn>
        <v-btn
          color='primary' variant='outlined' :loading='loading' :disabled='!newTag || loading'
          @click='saveTag'> {{ $t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <div>
    <v-data-table
      :headers='headers'
      :items='tags'
      :hide-default-footer='tags?.length < 5'
      :search='search'>
      <template v-slot:item.actions='{ item }'>
        <t-btn color='primary' :tooltip="$t('common.edit')" icon='mdi-pencil' @click='editTag(item)' />
        <t-btn :to='`/tag/${item.tag}`' color='success'  :tooltip="$t('common.preview')" icon='mdi-eye' />
        <t-btn color='error' :tooltip="$t('common.delete')" icon='mdi-delete-forever' @click='removeTag(item)' />
      </template>
    </v-data-table>
  </div>

</div>
</template>
