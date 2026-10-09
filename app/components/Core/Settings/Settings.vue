<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { SettingsMenuItemEntry, SettingsMenuItem } from './types'
import { SELECTED_SETTINGS_VIEW_KEY } from './constants'

const props = withDefaults(defineProps<{
  menuItems: SettingsMenuItem[]
  queryParam?: string
  title?: string
}>(), {
  queryParam: 'view',
  title: undefined
})

const { smAndDown: isMobile } = useDisplay()
const route = useRoute()

const getMenuItem = (value: unknown) => props.menuItems.find((i): i is SettingsMenuItemEntry => 'value' in i && i.value === value)
const getFirstMenuItem = () => props.menuItems.find(i => 'value' in i)

const selectedUrlParam = computed(() => {
  const query = route.query[props.queryParam]
  return Array.isArray(query) ? query[0] : query
})

const selectedViewId = ref(
  selectedUrlParam.value
    ? getMenuItem(selectedUrlParam.value)?.value
    : undefined
)

const setSelectedView = (selected: unknown) => {
  let value = Array.isArray(selected) ? selected[0] : selected
  if (value && !getMenuItem(value)) {
    value = getFirstMenuItem()?.value
  }
  if (value || isMobile.value) {
    selectedViewId.value = value
  }
}

const selectedItem = computed(() => getMenuItem(selectedViewId.value))

provide(SELECTED_SETTINGS_VIEW_KEY, selectedViewId)

watch(selectedViewId, () => {
  // Replace previous history entry when doing the initial redirect on desktop
  // to avoid putting the back action in an infinite loop
  const replace = !isMobile.value && !selectedUrlParam.value
  navigateTo({ query: { [props.queryParam]: selectedViewId.value } }, { replace })
})

watch(selectedUrlParam, () => {
  if (selectedUrlParam.value !== selectedViewId.value) {
    setSelectedView(selectedUrlParam.value)
  }
})

// Select first item automatically on desktop when there's none
watchEffect(() => {
  if (!isMobile.value && !selectedViewId.value) {
    setSelectedView(getFirstMenuItem()?.value)
  }
})

</script>
<template>
<div class="d-flex mx-n4 px-4 ga-4 ga-md-0 overflow-hidden">
  <v-scroll-x-reverse-transition :disabled="!isMobile">
    <div v-show="!isMobile || !selectedViewId" class="w-md-25 w-100 flex-shrink-0 d-md-block">
      <div v-if="title" class="text-h5 pa-4">
        {{ title }}
      </div>

      <v-list
        :selected="[selectedViewId]"
        density="compact"
        nav
        bg-color="transparent"
        :mandatory="!isMobile"
        @update:selected="setSelectedView"
      >
        <template v-for="item, idx in menuItems" :key="'value' in item ? item.value : `divider-${idx}` ">
          <v-divider v-if="item.type === 'divider'" class="my-3" />
          <v-list-item v-else-if="'value' in item" :value="item.value" :prepend-icon="item.icon">
            {{ item.title }}
            <template #append>
              <v-badge v-if="item.badge != null" inline color="primary" :content="item.badge" />
            </template>
          </v-list-item>
        </template>
      </v-list>

    </div>
  </v-scroll-x-reverse-transition>

  <v-divider vertical class="d-none d-md-block" />

  <!-- min-width: 0 lets this part shrink, so a wide table scrolls inside itself instead of pushing the page past the window -->
  <div class="flex-grow-1 px-md-12" style="min-width: 0">
    <div v-if="selectedItem" class="mb-2">
      <nuxt-link
        :to="{ query: { [queryParam]: undefined } }"
        class="d-md-none text-uppercase d-flex align-center ga-2 text-overline text-decoration-none"
      >
        <v-icon icon="mdi-arrow-left" size="x-small" />
        {{ $t('common.go_back') }}
      </nuxt-link>
      <div class="text-h4">{{ selectedItem.title }}</div>
    </div>
    <slot />

    <div v-if="!selectedItem" class="d-none d-md-flex align-center justify-center fill-height">
      <slot name="empty">
        <v-icon icon="mdi-cog" :size="256" class="opacity-10" />
      </slot>
    </div>
  </div>
</div>
</template>
