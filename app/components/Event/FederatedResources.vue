<script setup lang="ts">
const props = defineProps<{
  eventId: EventAPI['id']
  canModerate: boolean
}>()

const { data: resources, refresh } = useFetch<Resource[]>(() => `/api/resources/list/${props.eventId}`)
</script>

<template>
<div v-if="resources?.length" class="d-flex flex-column ga-1">

  <!--
    Make this client-only to avoid bots reading external users content and leave processing out of the server.
    In theory, this prevents indexing for most bots. Also we honour the indexable flag for everyone.
  -->
  <client-only>
    <template v-for="resource of resources" :key="resource.activitypub_id">
      <v-divider variant="dashed" />
      <FederationResource :resource="resource" :can-moderate="canModerate" :event-id="eventId" @update="refresh()" />
    </template>

    <template #fallback>
      <v-skeleton-loader v-for="idx of Math.min(resources.length, 3)" :key="idx" type="article" class="mb-2" />
    </template>

  </client-only>
</div>
</template>
