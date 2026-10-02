<script setup lang="ts">
import LinksList from './components/LinksList.vue'
import ThemeColorsPicker from './components/ThemeColorsPicker.vue'
import { useTheme } from 'vuetify'

const vTheme = useTheme()

const settings = useState<Settings>('settings')
const { $notify } = useNuxtApp()

const imageKeys = reactive({ logo: 0, header: 0, fallback: 0 })

async function updateColor (theme: 'light' | 'dark', color: string, value: string) {
  const settingsKey = theme === 'light' ? 'light_colors' : 'dark_colors'

  // Update settings
  settings.value[settingsKey][color] = value

  // Update Vuetify theme currently displayed
  if (vTheme.themes.value[theme]) {
    vTheme.themes.value[theme].colors[color] = value
  }

  // And update remote settings
  try {
    await $fetch('/api/settings', { method: 'PUT', body: { key: settingsKey, value: settings.value[settingsKey] } })
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function resetHeaderImage () {
  try {
    await $fetch('/api/settings', { method: 'PUT', body: { key: 'header_image', value: null } })
    imageKeys.header++
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function resetLogo () {
  try {
    await $fetch('/api/settings', { method: 'PUT', body: { key: 'logo', value: null } })
    imageKeys.logo++
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function resetFallbackImage () {
  try {
    await $fetch('/api/settings', { method: 'PUT', body: { key: 'fallback_image', value: null } })
    imageKeys.fallback++
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function resetFooterLinks () {
  footerLinks.value = [
    { href: '/', label: 'common.home' },
    { href: '/about', label: 'common.about' }
  ]
}

async function uploadLogo (file: File) {
  const formData = new FormData()
  formData.append('logo', file)
  try {
    await $fetch('/api/settings/logo', { method: 'POST', body: formData })
    imageKeys.logo++
    $notify('Logo updated!')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function uploadFallbackImage (file: File) {
  const formData = new FormData()
  formData.append('fallback_image', file)
  try {
    await $fetch('/api/settings/fallback_image', { method: 'POST', body: formData })
    imageKeys.fallback++
    $notify('Fallback image updated')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function uploadHeaderImage (file: File) {
  const formData = new FormData()
  formData.append('header_image', file)
  try {
    await $fetch('/api/settings/header_image', { method: 'POST', body: formData })
    imageKeys.header++
    $notify('Header image updated!')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

const is_dark = manageSetting('theme.is_dark')
const hide_thumbs = manageSetting('hide_thumbs')
const hide_calendar = manageSetting('hide_calendar')
const custom_css = manageSetting('custom_css')
const custom_js = manageSetting('custom_js')
const footerLinks = manageSetting('footerLinks')

</script>

<template>
<div class="d-flex flex-column ga-12 mt-4">

  <div class="d-flex flex-column ga-4">
    <v-switch
      v-model="is_dark"
      hide-details
      persistent-hint
      :hint="$t('admin.is_dark_help')"
      :label="$t('admin.is_dark')"
    />
    <v-switch
      v-model="hide_thumbs"
      hide-details
      :label="$t('admin.hide_thumbs')"
    />
    <v-switch
      v-model="hide_calendar"
      hide-details
      :label="$t('admin.hide_calendar')"
    />
  </div>

  <div>
    <div class="text-h5 mb-2">{{ $t('admin.default_images') }}</div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span class="text-subtitle-2 text-medium-emphasis" v-html="$t('admin.default_images_help')" />
    <div>
      <v-row>
        <v-col cols="4">
          <!-- LOGO -->
          <v-file-input
            ref="upload"
            class="mt-5"
            :label="$t('admin.favicon')"
            accept="image/*"
            @update:model-value="uploadLogo"
          >
            <template #append>
              <v-btn color="warning" variant='text' prepend-icon='mdi-restore' @click="resetLogo">
                {{ $t('common.reset') }}
              </v-btn>
            </template>
          </v-file-input>
          <v-img
            class="mt-2"
            :src="`/logo.png?${imageKeys.logo}`"
            max-height="60px"
            cover
          />
        </v-col>

        <v-col cols="4">
          <!-- FALLBACK IMAGE -->
          <v-file-input
            ref="upload"
            class="mt-5"
            :label="$t('admin.fallback_image')"
            persistent-hint
            accept="image/*"
            @update:model-value="uploadFallbackImage"
          >
            <template #append>
              <v-btn color="warning" variant='text' prepend-icon='mdi-restore' @click="resetFallbackImage">
                {{$t('common.reset')}}
              </v-btn>
            </template>
          </v-file-input>
          <v-img
            class="mt-2"
            :src="`/fallbackimage.png?${imageKeys.fallback}`"
            max-height="150px"
            cover
          />
        </v-col>

        <v-col cols="4">
          <!-- HEADER IMAGE -->
          <v-file-input
            ref="upload"
            class="mt-5"
            :label="$t('admin.header_image')"
            persistent-hint
            accept="image/*"
            @update:model-value="uploadHeaderImage"
          >
            <template #append>
              <v-btn color="warning" variant='text' prepend-icon='mdi-restore' @click="resetHeaderImage">
                {{$t('common.reset')}}
              </v-btn>
            </template>
          </v-file-input>
          <v-img
            class="mt-2"
            :src="`/headerimage.png?${imageKeys.header}`"
            max-height="150px"
            cover
          />
        </v-col>
      </v-row>
    </div>

  </div>

  <div>
    <div class="text-h5 mb-4">{{ $t('admin.colors') }}</div>
    <!-- choose theme colors -->

    <div class="d-flex flex-wrap ga-4">
      <theme-colors-picker theme="light" :colors="settings.light_colors" @change="updateColor" />
      <theme-colors-picker theme="dark" :colors="settings.dark_colors" @change="updateColor" />
    </div>

  </div>

  <links-list v-model="footerLinks" :title="$t('admin.footer_links')" @reset="resetFooterLinks" />

  <div>
    <div class="text-h5 mb-2">{{ $t('admin.custom_js') }}</div>
    <div class="text-subtitle-2 text-medium-emphasis mb-4" v-html="$t('admin.custom_js_help')" />
    <v-textarea v-model='custom_js' :label='$t("admin.custom_js")' variant='outlined' hide-details />
  </div>

  <div>
    <!-- custom css -->
    <div class="text-h5 mb-2">{{ $t('admin.custom_css') }}</div>
    <div class="text-subtitle-2 text-medium-emphasis mb-4" v-html="$t('admin.custom_css_help')" />
    <v-textarea v-model='custom_css' :label='$t("admin.custom_css")' variant='outlined' hide-details />
  </div>
</div>
</template>
