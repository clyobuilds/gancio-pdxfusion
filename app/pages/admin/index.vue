<script setup lang="ts">
import type { SettingsMenuItem } from '~/components/Core/Settings/types'
const { t } = useI18n()
const settings = useState<Settings>('settings')

definePageMeta({ middleware: ['authenticated'] })
useHead({
  title: settings.value.title + ' - ' + t('common.admin')
})

// refresh all settings
onMounted(async () => {
  settings.value = await $fetch('/api/settings')
})

const { isAdmin } = useAuth()

const { data: unconfirmedEvents, refresh } = await useFetch('/api/events/unconfirmed')

const menuItems = computed<SettingsMenuItem[]>(() => [
  {
    value: 'events',
    title: t('common.events'),
    icon: 'mdi-calendar',
    badge: unconfirmedEvents.value?.events?.length || null
  },
  { value: 'users', title: t('common.users'), icon: 'mdi-account-group' },
  { value: 'moderation', title: t('common.moderation'), icon: 'mdi-scale-balance' },

  { type: 'divider' },

  { value: 'collections', title: t('common.collections'), icon: 'mdi-group' },
  { value: 'places', title: t('common.places'), icon: 'mdi-map-marker' },
  { value: 'tags', title: t('common.tags'), icon: 'mdi-tag-text' },
  { value: 'announcements', title: t('common.announcements'), icon: 'mdi-bullhorn' },
  { value: 'pages', title: t('common.pages'), icon: 'mdi-post-outline' },

  { type: 'divider' },

  ...(isAdmin.value ? [{ value: 'settings', title: t('common.settings'), icon: 'mdi-cog' }] : []),
  { value: 'theme', title: t('common.theme'), icon: 'mdi-shape' },
  { value: 'email', title: t('common.email'), icon: 'mdi-email-outline' },
  { value: 'federation', title: t('common.federation'), icon: 'mdi-web' },
  { value: 'geolocation', title: t('admin.geolocation'), icon: 'mdi-map' },
  { value: 'plugins', title: t('common.plugins'), icon: 'mdi-toy-brick' }
])

</script>
<template>
<v-container>
  <!-- admin alert -->
  <AdminSetupAlert v-if="isAdmin" />

  <div class="mt-md-4 mb-8">
    <CoreSettings :menu-items="menuItems" :title="$t('common.admin')" query-param="view">
      <CoreSettingsView value="settings">
        <LazyAdminSettings />
      </CoreSettingsView>

      <CoreSettingsView value="users">
        <AdminUsers />
      </CoreSettingsView>

      <CoreSettingsView value="events">
        <LazyAdminEvents
          :unconfirmed-events='unconfirmedEvents?.events'
          :unconfirmed-old-events='unconfirmedEvents?.oldEvents'
          @confirmed='refresh'
          @removed='refresh'
        />
      </CoreSettingsView>

      <CoreSettingsView value='collections'>
        <LazyAdminCollections />
      </CoreSettingsView>

      <CoreSettingsView value='federation'>
        <LazyAdminFederation />
      </CoreSettingsView>

      <CoreSettingsView value='email'>
        <LazyAdminSMTP />
      </CoreSettingsView>

      <CoreSettingsView value='moderation'>
        <LazyAdminModeration />
      </CoreSettingsView>

      <CoreSettingsView value='places'>
        <LazyAdminPlaces />
      </CoreSettingsView>

      <CoreSettingsView value='tags'>
        <LazyAdminTags />
      </CoreSettingsView>

      <CoreSettingsView value='theme'>
        <LazyAdminTheme />
      </CoreSettingsView>

      <CoreSettingsView value='geolocation'>
        <LazyAdminGeolocation />
      </CoreSettingsView>

      <CoreSettingsView value='announcements'>
        <LazyAdminAnnouncements />
      </CoreSettingsView>

      <CoreSettingsView value='pages'>
        <LazyAdminPages />
      </CoreSettingsView>

      <CoreSettingsView value='plugins'>
        <LazyAdminPlugin />
      </CoreSettingsView>
    </CoreSettings>
  </div>
</v-container>
</template>
