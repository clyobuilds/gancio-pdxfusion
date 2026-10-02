<script setup lang="ts">
import type { GancioPluginManifest, GancioPluginSettingsValues } from '~~/server/services/plugins'

const props = defineProps<{
  plugin: GancioPluginManifest & { settingsValue: GancioPluginSettingsValues }
}>()

const emit = defineEmits<{
  (e: 'update', plugin: GancioPluginManifest): void
}>()

const isOpen = defineModel<boolean>({ required: true })

const { $notify } = useNuxtApp()

const form = ref()
const formValid = ref(true)
const formChanged = ref(false)

const settingsValues = ref<GancioPluginSettingsValues>({})

// Reset when the modal re-opens
watch(isOpen, (isOpen) => {
  if (!isOpen)
    return

  settingsValues.value = { ...props.plugin.settingsValue }
  formChanged.value = false
}, { immediate: true })

const testLoading = ref(false)

async function testPlugin() {
  testLoading.value = true
  try {
    await $fetch(`/api/plugins/${encodeURIComponent(props.plugin.name)}/test`,
      { method: 'POST', body: { settings: settingsValues.value } })
    $notify('common.ok', Statuses.SUCCESS)
  } catch (e) {
    console.error(e, typeof e)
    $notify(e, Statuses.ERROR)
  } finally {
    testLoading.value = false
  }
}

const saveLoading = ref(false)

async function save() {
  const { valid } = await form.value.validate()
  if (!valid) return

  saveLoading.value = true
  try {
    await $fetch(`/api/plugins/${encodeURIComponent(props.plugin.name)}/settings`, {
      method: 'PUT',
      body: settingsValues.value
    })
    isOpen.value = false
    emit('update', props.plugin)
  } finally {
    saveLoading.value = false
  }
}

</script>
<template>
<v-dialog v-model="isOpen" :persistent="formChanged" scrollable :fullscreen="$vuetify.display?.mobile" max-width='850px'>
  <v-card>
    <v-card-title>
      <div class="text-overline">{{ $t('admin.config_plugin') }}</div>
      <div>{{ plugin.name }}</div>
    </v-card-title>
    <v-divider class="mx-2 mx-md-4" />
    <v-card-text>
      <v-form ref="form" v-model="formValid" @change="formChanged = true">
        <v-row v-for="(setting, name, idx) in plugin.settings" :key="name">
          <v-divider v-if="idx > 0" class="my-1 mx-3" />
          <v-col :cols="setting.type === 'CHECK' ? 9 : 12" sm="8">
            <div :id="`plugin-option-${name}`" class="text-subtitle-2 font-weight-bold">
              {{ setting.description }}
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="setting.hint" class="text-body-2 font-weight-normal mt-1" v-html="setting.hint" />
          </v-col>
          <v-col :cols="setting.type === 'CHECK' ? 3 : 12" sm="4">
            <v-text-field
              v-if="setting.type === 'TEXT'"
              v-model="settingsValues[name]"
              variant="outlined"
              density="comfortable"
              :rules="[setting.required ? $valid.required(name) : true]"
              :clearable="!setting.required"
              :aria-labelled-by="`plugin-option-${name}`"
              hide-details="auto"
            />

            <v-text-field
              v-else-if="setting.type === 'URL'"
              v-model="settingsValues[name]"
              type="url"
              variant="outlined"
              density="comfortable"
              :rules="[$valid.url(setting.required)]"
              :clearable="!setting.required"
              :aria-labelled-by="`plugin-option-${name}`"
              hide-details="auto"
            />

            <v-number-input
              v-else-if="setting.type === 'NUMBER'" v-model="settingsValues[name]"
              variant="outlined"
              density="comfortable"
              :rules="[setting.required ? (value) => value === 0 || $valid.required(name)(value) : true]"
              :required="true"
              :min="setting.min"
              :max="setting.max"
              :clearable="!setting.required"
              :aria-labelled-by="`plugin-option-${name}`"
              hide-details="auto"
            />

            <v-select
              v-else-if="setting.type === 'LIST'" v-model="settingsValues[name]"
              variant="outlined"
              density="comfortable"
              :rules="[setting.required ? $valid.required(name) : true]"
              :clearable="!setting.required"
              :items="setting.items"
              :aria-labelled-by="`plugin-option-${name}`"
              hide-details="auto"
            />
            <div v-else-if="setting.type === 'CHECK'" class="d-flex justify-end align-center h-100">
              <v-switch
                v-model="settingsValues[name]"
                :aria-labelled-by="`plugin-option-${name}`"
                hide-details="auto"
              />
            </div>
          </v-col>
        </v-row>
      </v-form>

      <v-alert type="info" variant="tonal" rounded :icon="false" class="mt-8">
        <div class="d-flex align-center ga-4 flex-wrap flex-sm-nowrap">
          <span class="text-body-1">
            {{ $t("admin.plugin_test_description") }}
          </span>
          <v-btn
            color="info"
            variant="outlined"
            prepend-icon="mdi-beaker-question-outline"
            class="ms-auto"
            :disabled="!formValid"
            :loading="testLoading"
            @click="testPlugin"
          >
            {{ $t('common.test') }}
          </v-btn>
        </div>
      </v-alert>
    </v-card-text>

    <v-divider class="mx-2 mx-md-4" />
    <v-card-actions class="ma-md-2">
      <v-btn variant="text" @click="isOpen = false">{{ $t('common.close') }}</v-btn>
      <v-btn
        variant="flat"
        color="primary"
        :loading="saveLoading"
        :disabled="!formValid || saveLoading"
        @click="save"
      >
        {{ $t('common.save') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>

</template>
