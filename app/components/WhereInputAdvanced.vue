<script setup lang="ts">
// const event = defineModel<EventAPI>('event', { type: Object, required: true } )
const emit = defineEmits(['close', 'update:event'])
const place = defineModel('place', { type: Object, required: true })

</script>
<template>
<v-card>
  <v-card-title> {{ $t('event.where_advanced_options') }}</v-card-title>
  <v-card-subtitle>{{ $t('event.where_advanced_options_description') }}</v-card-subtitle>

  <v-card-text>
    <SearchAddress v-model:place='place' />
  </v-card-text>
  <v-card-actions>
    <v-spacer />
    <v-btn variant='outlined' :text="$t('common.close')" @click='emit("close")' />
  </v-card-actions>
</v-card>
</template>
