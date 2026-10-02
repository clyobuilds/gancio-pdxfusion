<script setup lang="ts">
type Link = { label: string, href: string }

defineProps<{ title: string }>()

const emit = defineEmits<{
  (e: 'reset'): void
  (e: 'change', value: Link[]): void
}>()

const { $confirm } = useNuxtApp()
const links = defineModel<Link[]>({ required: true })

const modalForm = ref()
const formValid = ref(false)
const modalOpen = ref(false)
const currentLink = reactive<Link>({ label: '', href: '' })
const isNew = ref(false)

function openModal (link?: Link) {
  if (link) {
    currentLink.label = link.label
    currentLink.href = link.href
    isNew.value = false
  } else {
    currentLink.label = ''
    currentLink.href = ''
    isNew.value = true
  }
  modalOpen.value = true
  modalForm.value?.reset()
}

function closeModal() {
  modalOpen.value = false
}

function add (link: Link) {
  const newList = [...links.value, { ...link }]
  links.value = newList
  emit('change', newList)
  closeModal()
}

async function remove(link: Link) {
  const ret = await $confirm('admin.delete_footer_link_confirm')
  if (!ret) {
    return
  }
  const newList = links.value.filter(l => l.label !== link.label)
  links.value = newList
  emit('change', newList)
}

async function move(idx: number, offset: number = -1) {
  const newList = [...links.value]
  newList[idx] = links.value[idx + offset] as Link
  newList[idx + offset] = links.value[idx] as Link

  links.value = newList
  emit('change', newList)
}

</script>
<template>
<div>
  <div class="d-flex align-start flex-wrap ga-4 mb-2 mb-sm-4">
    <div class="text-h5 flex-grow-1">{{ title }}</div>
    <div class="mx-auto">
      <v-btn color='primary' variant='text' prepend-icon='mdi-plus' @click='openModal()'> {{$t('common.add')}}</v-btn>
      <v-btn color='warning' variant='text' prepend-icon='mdi-restore' @click='emit("reset")'>{{$t('common.reset')}}</v-btn>
    </div>
  </div>

  <v-card>
    <v-list>
      <v-list-item v-for="(link, idx) in links" :key='`${link.label}`' @click='openModal(link)'>
        <v-list-item-title>{{$t(link.label)}}</v-list-item-title>
        <v-list-item-subtitle>{{link.href}}</v-list-item-subtitle>
        <template #append>
          <v-btn v-if="idx > 0" variant='text' density="comfortable" color='warn' icon='mdi-chevron-up' @click.stop='move(idx, -1)' />
          <v-btn variant='text' size="small" color='error' icon='mdi-minus-circle-outline' class="ms-sm-1" @click.stop='remove(link)' />
        </template>
      </v-list-item>
    </v-list>
  </v-card>

  <v-dialog v-model="modalOpen" max-width="500" :fullscreen='$vuetify.display?.mobile'>
    <v-card :title="title">
      <v-card-text>
        <v-form ref='modalForm' v-model='formValid'>
          <v-text-field
            v-model='currentLink.label'
            :rules="[$valid.required('common.name')]"
            :label="$t('common.name')"
          />
          <v-text-field
            v-model='currentLink.href'
            :rules="[$valid.required('common.url')]"
            :label="$t('common.url')"
            class="mt-2"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant='outlined' color='error' @click='modalOpen = false'> {{$t('common.cancel')}}</v-btn>
        <v-btn variant='flat' color='primary' :disabled='!formValid' @click='add(currentLink)'>
          {{ isNew ? $t('common.add') : $t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</div>

</template>
