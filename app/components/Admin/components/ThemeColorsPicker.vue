<script setup lang="ts">
import debounce from 'lodash/debounce'
import { useDisplay, useTheme } from 'vuetify'
import { VDialog, VMenu } from 'vuetify/components'

const vTheme = useTheme()
const currentTheme = vTheme.name

const { mobile: isMobile } = useDisplay()

const settings = useState<Settings>('settings')
const pageTitle = computed(() => settings.value.title)

type Theme = 'light' | 'dark'
const props = defineProps<{
  theme: Theme
  colors: ThemeColorPalette
}>()

const emit = defineEmits<{
  (e: 'change', theme: Theme, colorName: string, value: string): void
}>()

const onColorChange = debounce((colorName: string, colorValue: string) => {
  const hexColor = colorValue.substring(0, 7)
  emit('change', props.theme, colorName, hexColor)
}, 250, { maxWait: 1000 })

const menusOpen = reactive<{ [key: string ]: boolean }>({})

</script>
<template>
<v-theme-provider :theme="theme">
  <v-card class="flex-1-0" max-width="100%">
    <v-card-title class="text-primary d-flex ga-2 align-center">
      <v-icon :icon="theme === 'dark' ? 'mdi-weather-night' : 'mdi-weather-sunny'" :size="24" :opacity="1" />
      {{ pageTitle }}
    </v-card-title>
    <v-card-text class="d-flex flex-wrap ga-2">
      <template v-for='colorValue, colorName in colors' :key='colorName'>
        <component
          :is="isMobile ? VDialog : VMenu"
          v-model='menusOpen[colorName]'
          :close-on-content-click="false"
          transition="slide-y-transition"
          location="bottom end"
        >
          <template #activator="{ props: activator }">
            <v-btn :color="colorValue" size="small" v-bind="activator">{{ colorName }}</v-btn>
          </template>
          <v-color-picker
            mode="hex"
            :theme="currentTheme"
            :model-value="colorValue"
            class="mx-auto"
            @update:model-value="newValue => onColorChange(colorName, newValue)"
          />
        </component>
      </template>
    </v-card-text>
  </v-card>
</v-theme-provider>
</template>
