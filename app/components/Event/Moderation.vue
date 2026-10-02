<script setup>
const time = useTime()
const props = defineProps({ event: { type: Object, default: () => ({}) } })
defineEmits(['close'])
const { isAdmin } = useAuth()

const { $notify } = useNuxtApp()

const message = ref('')
const loading = ref(false)
const { data: messages, refresh } = useFetch(() => `/api/events/messages/${props.event.id}`)

async function sendMessage(is_author_visible) {
  if (loading.value) return
  try {
    loading.value = true
    await $fetch(`/api/events/messages/${props.event.id}`, {
      method: 'POST', body: { is_author_visible, message: message.value }
    })
    message.value = ''
    loading.value = false
    refresh()
  } catch (e) {
    console.error(e)
    $notify(e)
    loading.value = false
  }
}
</script>

<template>
<v-card class="eventModeration">
  <v-toolbar :title="$t('common.moderation')">
    <v-btn icon="mdi-chevron-right" @click="$emit('close', false)"/>
  </v-toolbar>
  <v-card-text class="d-flex flex-column flex-grow-1 overflow-auto">
    <span>{{ $t(isAdmin ? 'event.message_hint' : 'event.message_author_hint') }}</span>
    <v-textarea
      v-model='message'
      :label="$t('event.message')" rows="2" class="mb-2" />

    <template v-if="isAdmin">
      <v-btn class='mb-1' variant="outlined" :disabled='!message || loading' :loading='loading' color="primary" @click="sendMessage(false)">{{$t('event.send_to_admins')}}</v-btn>
      <v-btn v-if='!event.isAnon' class='mb-1' variant="outlined" :disabled='!message || loading' :loading='loading' color="primary" @click="sendMessage(true)">{{$t('event.send_to_author_too')}}</v-btn>
    </template>

    <v-btn v-else size="small" variant="outlined" :disabled='!message || loading' :loading='loading' color="primary" @click="sendMessage(true)">send</v-btn><br>

    <v-list density="compact" class='messageList'>
      <v-list-item v-for="(item, index) in messages" :key="index" class="px-2" :class="item.author" :title='item?.message'>
        <v-list-item-subtitle class="font-weight-light">{{ time.format(item.createdAt) }} / {{ item.author }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-card-text>
</v-card>
</template>

<style>
.eventModeration {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.eventModeration .messageList {
    overflow-y: auto;
    flex-grow: 1;
    padding: 0px;
    margin: 8px 0;
}

.eventModeration .v-textarea {
    flex-grow: 0;
}

.eventModeration .messageList .v-list-item {
    border-top: 1px solid rgba(100,100,100,.07);
    word-break: break-word;
}

.eventModeration .messageList .v-list-item.ADMIN {
    background-color: rgba(200,100,100,0.1);
    border-left: 2px solid rgba(255,69,0, 0.3);
}

.eventModeration .messageList .v-list-item.AUTHOR {
    border-left: 2px solid lightblue;
    background-color: rgba(35, 193, 255, 0.1);
}

</style>
