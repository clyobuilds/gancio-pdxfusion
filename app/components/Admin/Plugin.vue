<script setup>
import PluginConfigurationModal from './components/PluginConfigurationModal.vue'

const dialog = ref(false)
const selectedPlugin = ref()

function openSettings(plugin) {
  selectedPlugin.value = plugin
  dialog.value = true
}

const { $notify } = useNuxtApp()
const { data: plugins, refresh } = await useFetch('/api/plugins')

const pluginStateLoading = reactive({})

async function togglePluginEnable(enable, plugin) {
  pluginStateLoading[plugin.name] = true
  plugin.settingsValue.enable = enable
  try {
    await $fetch(`/api/plugins/${encodeURIComponent(plugin.name)}/toggle?enable=${enable}`, {
      method: 'PUT'
    })
  } catch (err) {
    console.error(err, typeof err)
    $notify(err, Statuses.ERROR)
  } finally {
    // Refresh to update settings and undo local change in case of error
    await refresh()
    pluginStateLoading[plugin.name] = false
  }
}
</script>

<template>
<div>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="text-subtitle-2 text-medium-emphasis" v-html="$t('admin.plugins_description')" />

  <PluginConfigurationModal
    v-if="selectedPlugin?.settingsValue"
    v-model="dialog"
    :plugin="selectedPlugin"
    @update="refresh()"
  />

  <div class='my-12'>
    <template v-for='plugin, idx in plugins' :key='plugin.name'>
      <v-divider v-if="idx > 0" class="my-4" />
      <article>
        <div class="d-flex ga-3 align-center mt-n2">
          <div class="text-h6">{{ plugin.name }}</div>
          <v-chip
            v-if="plugin.version"
            color="primary"
            variant="tonal"
            size="x-small"
            class="font-weight-semibold whitespace-nowrap"
            :text="plugin.version"
          />
          <v-spacer />
          <v-switch
            hide-details
            class="flex-0-0"
            :loading="pluginStateLoading[plugin.name]"
            :model-value="plugin.settingsValue.enable"
            @update:model-value="togglePluginEnable($event, plugin)"
          />
          <v-btn variant="text" icon="mdi-cog" :aria-label="$t('admin.config_plugin')" class="my-n2" @click='openSettings(plugin)'/>
        </div>

        <div class="text-subtitle-2 text-medium-emphasis w-sm-75">{{ plugin.description }}</div>

        <div class="d-flex flex-wrap align-center gc-4 gr-1 mt-4 text-subtitle-2">
          <div v-if="plugin.author" class="d-flex align-center ga-1">
            <v-icon size="small" icon="mdi-at" />
            <span>{{ plugin.author }}</span>
          </div>
          <div v-if="plugin.url" class="d-flex align-center ga-1">
            <v-icon size="small" icon="mdi-web" />
            <a :href='plugin.url' target="_blank" v-text='plugin.url.replace(/^https?:\/\//, "")'/>
          </div>
        </div>
      </article>
    </template>

  </div>
</div>
</template>
