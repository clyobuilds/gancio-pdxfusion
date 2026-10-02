<script setup lang='ts'>
import debounce from 'lodash/debounce'
defineProps({ isDialog: { type: Boolean, default: false } })
defineEmits(['close'])

const instance_hostname = ref('')
const proceed = ref(false)
const instance = ref({ title: '', thumbnail: '' })
const loading = ref(false)

const { data: stats } = useFetch('/api/ap_actors/stats')
const settings = useState<Settings>('settings')

const link = computed(() => `https://${instance_hostname.value}/authorize_interaction?uri=${settings.value.instance_name}@${settings.value.hostname}`)
const getInstanceInfo = debounce(() => {
  if (!instance_hostname.value) {
    return
  }
  loading.value = true
  const instance_url = `https://${instance_hostname.value}/api/v1/instance`
  $fetch(instance_url)
    .then((ret) => {
      instance.value = ret
      proceed.value = true
      loading.value = false
    })
    .catch((_e) => {
      instance.value = {}
      proceed.value = false
      loading.value = false
    })
}, 300)
</script>
<template>
<v-card>
  <v-card-title class="bg-primary" >
    {{ $t('common.follow_me_title')}}
  </v-card-title>
  <v-card-text>
    <v-alert class='mb-4' type="info" border="start" icon="mdi-information">
      {{$t('admin.stats', stats)}}
    </v-alert>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-html="$t('event.follow_me_description', { title: settings.title, account: `@${settings.instance_name}@${settings.hostname}`})" />
    <v-text-field
      v-model="instance_hostname"
      :rules="[$valid.required('common.url')]"
      :loading="loading"
      :label="$t('common.url')"
      @update:model-value="getInstanceInfo"
    >
      <template v-if="!isDialog" #prepend>
        <v-btn
          variant='text'
          :disabled="(!proceed)"
          :href="link"
          target="_blank"
          :loading="loading"
          color="primary"
        >
          {{$t("common.follow")}}
        </v-btn>
      </template>
      <template #append>
        <p>
          <img class="instance_thumb" :src="instance.thumbnail">
          {{instance.title}}
        </p>
      </template>
    </v-text-field>
  </v-card-text>

  <v-card-actions v-if="isDialog">
    <v-btn variant='outlined' color="info" @click='$copyToClipboard(`@${settings.instance_name}@${settings.hostname}`)'>
      {{$t("common.copy")}}  @{{settings.instance_name}}@{{settings.hostname}}
    </v-btn>
    <v-spacer/>
    <v-btn v-if="isDialog" variant='outlined' color="warning" @click="$emit('close')">
      {{$t("common.cancel")}}
    </v-btn>
    <v-btn
      :disabled="(!proceed)"
      variant='outlined'
      :href="link"
      target="_blank"
      :loading="loading"
      color="primary"
    >
      {{$t("common.follow")}}
    </v-btn>
  </v-card-actions>
</v-card>
</template>

<style>
.instance_thumb {
  height: 20px;
}
</style>
