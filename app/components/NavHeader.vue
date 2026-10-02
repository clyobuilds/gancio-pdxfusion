<script setup lang="ts">
import { useLocale } from 'vuetify'

const { loggedIn, user, clear } = useUserSession()
const { $notify } = useNuxtApp()
const theme = useAppTheme()
const { showRecurrent, toggleShowRecurrent } = useShowRecurrent()
const route = useRoute()
const settings = useState<Settings>('settings')

const { locales, t } = useI18n()
const { current } = useLocale()

function changeLocale (locale: string) {
  current.value = locale
}

function logout () {
  clear()
  $notify('common.logout_ok', Statuses.SUCCESS)
  navigateTo('/')
}

const in_home = computed(() => route.name === 'index')
</script>
<template>
<div class='d-flex pa-3 pa-sm-4'>
  <v-btn icon to='/' variant='text' :active="false">
    <img :src='`/logo.png`' height='40'>
  </v-btn>
  <v-spacer/>

  <div class='d-flex'>
    <v-switch
      v-if='in_home && settings.allow_recurrent_event'
      id='show_recurrent_switch'
      :model-value='showRecurrent'
      class='mr-2'
      color='primary'
      true-icon='mdi-repeat'
      false-icon='mdi-repeat-off'
      hide-details
      @update:model-value="toggleShowRecurrent"
    />

    <!-- TODO <t-btn icon='mdi-magnify' to='/search' tooltip='common.search' /> -->
    <t-btn icon="mdi-information" to='/about' tooltip='common.about' :aria-label='t("common.about")' />

    <t-btn :icon="theme?.theme.current?.value?.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'" tooltip='common.dark_mode' @click='theme.toggleTheme()' />

    <!-- language selection menu -->
    <v-menu transition="slide-y-transition">
      <template #activator="{ props }">
        <v-btn variant='plain' icon='mdi-translate' v-bind='props' aria-label='Language' tooltip='common.language' />
      </template>
      <v-list density='compact' max-height="350" width="250">
        <v-list-item v-for='locale in locales' :key='locale.code' :title='locale.name' @click.prevent="changeLocale(locale.code)" />

        <v-list-item target='_blank' href='https://hosted.weblate.org/engage/gancio/'>
          <v-list-item-subtitle>{{t("common.help_translate")}}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- auth menu -->
    <v-menu v-if='loggedIn' transition="slide-y-transition">
      <template v-slot:activator="{ props }">
        <v-btn variant="plain" class='mr-0' icon="mdi-dots-vertical" v-bind='props' title='Menu' aria-label='Menu' />
      </template>
      <v-list>
        <v-list-item to='/settings' prepend-icon='mdi-cog' :title="t('common.settings')"/>

        <v-list-item to='/my_events'>
          <template v-slot:prepend><v-icon icon='mdi-calendar-account'/></template>
          <v-list-item-title>{{t('common.my_events')}}</v-list-item-title>
        </v-list-item>
        <v-list-item v-if='user?.role === "admin" || user?.role === "editor"' to='/admin'>
          <template v-slot:prepend><v-icon icon='mdi-account' /></template>
          <v-list-item-title>{{t(`common.${user.role}`)}}</v-list-item-title>
        </v-list-item>

        <v-list-item @click='logout'>
          <template v-slot:prepend><v-icon icon='mdi-logout' /></template>
          <v-list-item-title>{{t('common.logout')}}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- login button -->
    <v-btn v-if='!loggedIn' variant="text" class='mr-0' icon="mdi-login"  to='/login' :title='t("common.login")' :aria-label='t("common.login")' />
  </div>
</div>
</template>
