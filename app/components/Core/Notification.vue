<!-- Notification component -->
<script setup>
const { t } = useI18n()

onMounted(() => {
  const { $on } = useNuxtApp()
  $on('notify', showNotification)
})

const notifications = ref([])

function showNotification(ev) {
  const msg = t(ev.msg, ev?.args)
  notifications.value.unshift({ msg, status: ev.status })
  setTimeout(() => notifications.value.pop(), 5000)
}

</script>
<template>
<div style="z-index: 10000; position: fixed; right: 1em; bottom: 1rem; opacity: 0.9;" class="mb-2">
  <v-alert
    v-for="notification in notifications" :key="notification" variant="flat"
    border='start'  elevation="2" class='mb-2'
    min-width="350px"  max-width="800px" :type="notification?.status ?? 'warning'" :text="notification.msg"/>
</div>
</template>
