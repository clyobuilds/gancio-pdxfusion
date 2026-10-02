<script setup lang="ts">
const props = defineProps<{
  title?: string
  events: EventAPI[]
  maxEvents?: number
}>()

const time = useTime()

const computedEvents = computed(() => {
  if (!props.maxEvents) return props.events
  return props.events.slice(0, props.maxEvents)
})

</script>
<template>
<v-list id='list' nav density="compact">
  <v-list-item>
    <h3 v-if='title'>{{ title}}</h3>
  </v-list-item>
  <v-list-item
    v-for='event in computedEvents'
    :key='`sameday_${event.id}`'
    density="compact"
    target='_blank'
    :to='`/event/${event.slug || event.id}`'
  >
    <v-list-item-subtitle>
      <v-icon v-if='event.parentId' size="small" color='success' icon='mdi-repeat' />
      {{ time.when(event)}}
      <span v-if='event.place' class='text-primary ml-1'>@{{event.place?.name}}</span>
    </v-list-item-subtitle>
    <v-list-item-title>{{event.title}}</v-list-item-title>
  </v-list-item>
</v-list>
</template>

<style scoped>
#list {
  max-width: 500px;
  margin: 0 auto;
}

</style>
