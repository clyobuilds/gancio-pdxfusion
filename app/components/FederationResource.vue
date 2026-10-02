<script setup lang="ts">
const props = defineProps<{
  resource: Resource
  eventId: EventAPI['id']
  canModerate: boolean
}>()

const emit = defineEmits<{
  (e: 'update', resource: Resource): void
}>()

const { $confirm, $notify } = useNuxtApp()
const time = useTime()

const isImg = (attachment): boolean => attachment.mediaType?.startsWith('image/')
const isAudio = (attachment): boolean => attachment.mediaType?.startsWith('audio/')

const apUserHandle = computed(() => {
  const ap_user = props.resource.APUser
  if (!ap_user) {
    return null
  }
  const domain = new URL(ap_user.ap_id).hostname
  return `@${ap_user.object.preferredUsername}@${domain}`
})

const selectedResourceMedia = ref()
const selectedAttachment = ref<string>()
function openAttachmentDialog(attachment: string) {
  const attachments = props.resource.data.attachment.filter(isImg)
  selectedResourceMedia.value = attachments.map(attachment => ({ src: attachment.url, description: attachment.name }))
  selectedAttachment.value = attachment
}

async function hideResource (hidden: boolean) {
  await $fetch('/api/resources', {
    method: 'PUT',
    body: { id: props.resource.activitypub_id, hidden }
  })
  emit('update', props.resource)
}

async function toggleUserBlock (ap_user: APUser) {
  if (!ap_user.blocked) {
    const ret = await $confirm('admin.user_block_confirm', { user: apUserHandle.value })
    if (!ret) {
      return
    }
  }
  await $fetch('/api/ap_actors/toggle_block', { method: 'PUT', body: { ap_id: ap_user.ap_id } })
  emit('update', props.resource)
}

async function removeResource() {
  const ret = await $confirm('admin.delete_resource_confirm')
  if (!ret) {
    return
  }
  const id = props.resource.activitypub_id
  try {
    await $fetch(`/api/resources`, {
      method: 'DELETE',
      body: { id }
    })
    emit('update', props.resource)
  } catch (e) {
    $notify(String(e), Statuses.ERROR)
  }
}

function onClick(event: PointerEvent) {
  const clickedOnLink = (event.target as HTMLElement).closest('a') != null
  if (clickedOnLink) {
    event.stopPropagation()
  } else {
    navigateTo(props.resource.activitypub_id, { external: true, open: { target: '_blank' } })
  }
}
</script>

<template>
<article
  class="resource cursor-pointer rounded pa-3 mx-n3"
  :class="{ 'resource--hidden': resource.hidden}"
  @click="onClick"
>
  <div class="d-flex align-center ga-2 mb-2">
    <v-icon v-if="resource.data.type === 'Note'" icon="mdi-arrow-left-top" size="x-small" />
    <time v-if="resource.data?.published" :datetime="resource.data.published" class="text-body-2">
      {{ time.format(resource.data.published, 'ff') }}
    </time>
    <v-spacer/>
    <v-icon v-if="resource.APUser?.blocked" icon="mdi-cancel" size="small" color="error" :title="$t('admin.blocked')" />
    <v-chip v-if="resource.hidden" variant="tonal" density="compact" color="warning" prepend-icon="mdi-eye-off">
      {{ $t("admin.hidden") }}
    </v-chip>
    <v-menu v-if="canModerate">
      <template #activator="{ props: activatorProps }">
        <v-btn icon="mdi-dots-vertical" variant="text" size="x-small" class="my-n1" v-bind="activatorProps" />
      </template>
      <v-list prepend-gap="16">
        <v-list-item
          v-if="resource.hidden"
          :title="$t('admin.show_resource')"
          prepend-icon="mdi-eye"
          @click="hideResource(false)"
        />
        <v-list-item
          v-else
          :title="$t('admin.hide_resource')"
          prepend-icon="mdi-eye-off"
          @click="hideResource(true)"
        />
        <v-list-item
          :title="$t('admin.delete_resource')"
          prepend-icon="mdi-note-remove-outline"
          @click="removeResource()"
        />
        <v-list-item
          v-if="resource.APUser && !resource.APUser.blocked"
          :title="$t('admin.block_user')"
          prepend-icon="mdi-account-cancel-outline"
          @click="toggleUserBlock(resource.APUser)"
        />
        <v-list-item
          v-else-if="resource.APUser && resource.APUser.blocked"
          :title="$t('admin.unblock_user')"
          prepend-icon="mdi-account-check-outline"
          @click="toggleUserBlock(resource.APUser)"
        />
      </v-list>
    </v-menu>
  </div>

  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="resource__content" v-html="resource.data?.content" />

  <div v-if="resource.data.attachment?.length" class="d-flex flex-wrap ga-2 mt-4 resource__attachments">
    <template v-for="attachment of resource.data.attachment" :key="attachment.url">
      <v-img
        v-if="isImg(attachment)"
        :src="attachment.url"
        :alt="attachment.name"
        loading="lazy"
        cover
        height="150"
        :width="(attachment.width * 150 / attachment.height) || 'fit-content'"
        max-width="250"
        rounded
        class="flex-0-0"
        @click.stop="openAttachmentDialog(attachment.url)"
      />
      <audio v-else-if="isAudio(attachment)" :src="attachment.url" controls loading="lazy" />
    </template>
  </div>

  <div v-if="canModerate && resource.APUser" class="d-flex align-center ga-1 mt-3 text-body-2 text-medium-emphasis">
    <v-icon icon="mdi-account" size="small" />
    <a :href="resource.APUser.object.url || resource.APUser.object.ap_id" target="_blank" class="text-decoration-none">{{ apUserHandle }}</a>
  </div>
  <client-only>
    <CoreCarousel v-model="selectedAttachment" :media="selectedResourceMedia" />
  </client-only>
</article>
</template>

<style>
.resource:not(:has(.resource__attachments:hover)):hover {
  background: rgba(var(--v-theme-primary), calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier)));
  transition: .2s background-color;
}

.resource__attachments {
  width: fit-content
}

.resource--hidden .resource__content,
.resource--hidden .resource__attachments {
  opacity: .6;
  transition: .2s opacity;
}
.resource--hidden:hover .resource__content,
.resource--hidden:hover .resource__attachments {
  opacity: 1;
}
</style>
