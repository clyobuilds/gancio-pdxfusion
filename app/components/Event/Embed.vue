<script setup>
const settings = useState('settings')
const props = defineProps({
  event: { type: Object, default: () => ({}) }
})

const code = computed(() => `<script src='${settings.value.baseurl}\/gancio-events.es.js'><\/script>\n<gancio-event baseurl='${settings.value.baseurl}' id=${props.event.id}></gancio-event>\n\n`)

defineEmits(['close'])
</script>
<template>
<v-card>
  <v-card-title class="bg-primary">{{$t('common.embed_title')}}</v-card-title>
  <v-card-text>
    <!-- <v-alert class="mb-3 mt-1" type="info" show-icon icon="mdi-information"> -->
    {{$t('common.embed_help')}}
    <!-- </v-alert> -->
    <v-alert class="pa-5 my-4 bg-blue-grey-darken-4 text-body-1 text-lime-lighten-3">
      <pre>{{code}}</pre>
      <v-btn class="float-end" variant='flat' color="primary" @click="$copyToClipboard(code)">
        {{$t("common.copy")}}
        <v-icon class="ml-1" icon="mdi-content-copy" />
      </v-btn>
    </v-alert>
    <p class="mx-auto">
      <span class="mx-auto">
        <gancio-event :id="event.id" :baseurl="settings.baseurl" />
      </span>
    </p>
  </v-card-text>
  <v-card-actions>
    <v-spacer />
    <v-btn variant='outlined' color="warning" @click="$emit('close')">
      {{$t("common.close")}}
    </v-btn>
    <v-btn variant='outlined' color="primary" @click="$copyToClipboard(code)">
      {{$t("common.copy")}}
    </v-btn>
  </v-card-actions>
</v-card>
</template>
