<script setup lang="ts">
import { DateTime } from 'luxon'
import tzNames from './tz.json'

const { locales } = useI18n()

// const instanceSettings = await $fetch('/api/settings')

const title = manageSetting('title')
const description = manageSetting('description')
const instance_timezone = manageSetting('instance_timezone')
// const instance_name = manageSetting('instance_name')
const instance_locale = manageSetting('instance_locale')
const allow_registration = manageSetting('allow_registration')
const allow_anon_event = manageSetting('allow_anon_event')
const allow_multidate_event = manageSetting('allow_multidate_event')
const allow_recurrent_event = manageSetting('allow_recurrent_event')
const recurrent_event_visible = manageSetting('recurrent_event_visible')
const allow_event_without_end_time = manageSetting('allow_event_without_end_time')
const open_ended_event_default_duration = manageSetting('open_ended_event_default_duration')
const allow_online_event = manageSetting('allow_online_event')
const allow_geolocation = manageSetting('allow_geolocation')
const show_download_media = manageSetting('show_download_media')
const enable_moderation = manageSetting('enable_moderation')
const enable_report = manageSetting('enable_report')

// move the current user timezone to the top of the list
const filteredTimezones = computed(() => {
  const current_timezone = DateTime.local().zoneName
  tzNames.unshift(current_timezone)
  // remove current_timezone duplicates
  return Array.from(new Set(tzNames))
})

</script>
<template>
<div class="mt-4">
  <div>

    <v-text-field
      v-model="title"
      :label="$t('common.title')"
      :hint="$t('admin.title_description')" persistent-hint />

    <v-text-field
      v-model="description" class='mt-5'
      :label="$t('common.description')"
      :hint="$t('admin.description_description')" persistent-hint />

    <!-- <v-text-field class='mt-5' v-model="instance_name"
      :label="$t('common.instance_name')"
      :hint="$t('admin.description_description')" persistent-hint /> -->

    <v-autocomplete
      v-model="instance_timezone"
      class="mt-5"
      :label="$t('admin.select_instance_timezone')" :hint="$t('admin.instance_timezone_description')"
      :items="filteredTimezones" persistent-hint placeholder="Timezone, type to search" />

    <v-select
      v-model="instance_locale"
      class="mt-5"
      :label="$t('admin.instance_locale')"
      :hint="$t('admin.instance_locale_description')"
      persistent-hint
      item-title="name"
      item-value="code"
      :items="locales" />

    <v-divider class="my-6" />

    <v-switch
      v-model="allow_registration"
      class="mt-4"
      :label="$t('admin.allow_registration_description')" />

    <v-switch
      v-model="allow_anon_event"
      class="mt-1"
      :label="$t('admin.allow_anon_event')"
      hide-details />

    <v-divider class="my-6" />

    <v-switch
      v-model="allow_multidate_event"
      class="mt-1"
      :label="$t('admin.allow_multidate_event')" />

    <v-switch
      v-model="allow_recurrent_event"
      class="mt-1"
      :label="$t('admin.allow_recurrent_event')" />

    <v-switch
      v-if="allow_recurrent_event" v-model="recurrent_event_visible"
      class="mt-1"
      :label="$t('admin.recurrent_event_visible')" />

    <v-switch
      v-model="allow_event_without_end_time"
      class="mt-1"
      :label="$t('admin.allow_event_without_end_time')"
    />

    <v-text-field
      v-if="allow_event_without_end_time"
      v-model="open_ended_event_default_duration"
      :label="$t('admin.open_ended_event_default_duration')"
      type="number"
      min="1"
      step="1"
      persistent-hint
      suffix="h"
      :clearable="false"
      :hint="$t('admin.open_ended_event_default_duration_hint')"
    />

    <v-divider class="my-6" />

    <v-switch
      v-model="allow_online_event"
      class="mt-1"
      :label="$t('admin.allow_online_event')" />

    <v-switch
      v-model="allow_geolocation"
      class="mt-4"
      persistent-hint :hint="$t('admin.allow_geolocation_hint')"
      :label="$t('admin.allow_geolocation')" />

    <v-switch
      v-model="show_download_media"
      class="mt-4"
      persistent-hint :hint="$t('admin.show_download_media_hint')"
      :label="$t('admin.show_download_media')" />

    <v-divider class="my-6" />

    <v-switch
      v-model="enable_moderation"
      class="mt-4"
      density='compact'
      persistent-hint :hint="$t('admin.enable_moderation_hint')"
      :label="$t('admin.enable_moderation')" />

    <v-switch
      v-if="enable_moderation" v-model='enable_report'
      class="mt-4"
      persistent-hint
      :hint="$t('admin.enable_report_hint')"
      :label="$t('admin.enable_report')" />
  </div>
</div>
</template>
