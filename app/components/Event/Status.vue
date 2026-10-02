<script setup lang="ts">
import type { EventStatus } from '~~/server/services/db'

const { event } = defineProps<{ event: EventAPI }>()
const { t } = useI18n()

type DisplayableStatus = Exclude<EventStatus, 'EventScheduled'>

const statusMap: Record<DisplayableStatus, { color: string, title: string }> = {
  EventCancelled: { color: 'error', title: t('event.cancelled') },
  EventPostponed: { color: 'info', title: t('event.postponed') },
  EventMovedOnline: { color: 'info', title: t('event.moved_online') },
  EventRescheduled: { color: 'warning', title: t('event.rescheduled') },
  EventTentative: { color: 'info', title: t('event.tentative') }
}

const hasStatus = (status: EventStatus): status is DisplayableStatus => Object.hasOwn(statusMap, status)
</script>

<template>
<v-alert
  v-if="hasStatus(event.status)"
  border="bottom"
  :color="statusMap[event.status].color">
  {{statusMap[event.status].title}}
  <meta itemprop='eventStatus' :content="event.status">
</v-alert>
</template>
