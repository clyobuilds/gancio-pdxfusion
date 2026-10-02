<script setup lang="ts">
defineOptions({
  inheritAttrs: false // Prevent inheriting v-model
})

interface Media {
  src: string
  description?: string
}
const props = defineProps<{
  media?: Media[] | null
}>()

const arrowBtn = useTemplateRef('arrowBtn')

const selectedUrl = defineModel<string | null | undefined>()

const carouselIndex = ref<number>(0)
watch(selectedUrl, (val, previousVal) => {
  if (val) { // Only set index while open to avoid funky animations on close
    carouselIndex.value = props.media?.findIndex(item => item.src === val) || 0
    if (!previousVal) {
      // Focus arrow after opening to enable keyboard navigation
      nextTick(() => arrowBtn.value?.$el.focus({ focusVisible: false }))
    }
  }
})
function onCarouselChange(idx: number) {
  selectedUrl.value = props.media?.[idx]?.src
}

const isOpen = computed({
  get() {
    return Boolean(selectedUrl.value)
  },
  set(val) {
    if (!val) {
      selectedUrl.value = null
    }
  }
})

const selectedMediaAltText = computed(() => {
  const plainText = props.media?.[carouselIndex.value]?.description
  return plainText
    ? plainText.split(/\n+/g)
    : null
})

const showControls = computed<boolean>(() => props.media != null && props.media.length > 1)
</script>

<template>
<v-dialog v-model="isOpen" fullscreen destroy-on-close :opacity=".85">
  <div class="d-flex flex-column h-100">

    <div class="d-flex align-center justify-end ga-2 pa-1">
      <v-menu v-if="selectedMediaAltText" max-width="500">
        <template #activator="{ props: activatorProps }">
          <v-btn variant="text" color="white" text="ALT" v-bind="activatorProps"  />
        </template>
        <v-sheet class="pa-4">
          <p v-for="paragraph, idx of selectedMediaAltText" :key="idx" class="mb-2">{{ paragraph }}</p>
        </v-sheet>
      </v-menu>
      <v-btn v-if="selectedUrl" as="a" variant="text" color="white" icon="mdi-download" :href="selectedUrl" download />
      <v-btn icon="mdi-close" variant="text" color="white" :aria-label="$t('common.close')" @click="isOpen = false" />
    </div>

    <v-carousel
      height="100%"
      hide-delimiter-background
      :hide-delimiters="!showControls"
      :show-arrows="showControls"
      color="white"
      :model-value="carouselIndex"
      @update:model-value="onCarouselChange"
    >
      <v-carousel-item v-for="item of media" :key="item.src" @click="isOpen = false">
        <div class="d-flex flex-column justify-center align-center h-100 pb-14 mx-sm-4 px-sm-16">
          <v-img :src='item.src' :alt="item.description" width="fit-content" rounded class="flex-grow-0" @click.stop  />
        </div>
      </v-carousel-item>

      <template #prev="{ props: btnProps }">
        <v-btn ref="arrowBtn" variant="text" color="white" class="mx-n3 mx-sm-0 arrow-btn" v-bind="btnProps" />
      </template>
      <template #next="{ props: btnProps }">
        <v-btn ref="arrowBtn" variant="text" color="white" class="mx-n3 mx-sm-0 arrow-btn" v-bind="btnProps" />
      </template>

    </v-carousel>
  </div>
</v-dialog>
</template>
<style scoped>
.arrow-btn {
  text-shadow: 1px 1px 1px rgba(0,0,0,.5);
}
</style>
