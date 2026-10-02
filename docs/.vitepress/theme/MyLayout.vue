<!-- .vitepress/theme/Layout.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import DefaultTheme from 'vitepress/theme'
import useSynchronizeThemes from './useSynchronizeThemes'
import { useRoute, useData } from 'vitepress'
// import VPPage from 'vitepress/dist/client/theme-default/components/VPPage.vue'
import VPContent from 'vitepress/dist/client/theme-default/components/VPContent.vue'
import VPNav from 'vitepress/dist/client/theme-default/components/VPNav.vue'
import VPFooter from 'vitepress/dist/client/theme-default/components/VPFooter.vue'
import VPHero from 'vitepress/dist/client/theme-default/components/VPHero.vue'

function formatDate(date: string) {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(date).toLocaleDateString(undefined, options)
}

const { Layout } = DefaultTheme
useSynchronizeThemes()
const route = useRoute()
const { frontmatter, page } = useData()
const date = computed(() => formatDate(page.value.frontmatter?.date ?? new Date()))
const tagline = computed(() => page.value.frontmatter?.title == 'News' ? '' : `${date.value}`)
</script>

<template>
<v-app>
  <Layout v-if="!route.path.includes('/blog')" />
  <div v-else class='Layout'>
    <VPNav />
    <VPContent>
      <template #doc-before>
        <VPHero :name='frontmatter.title' :tagline='tagline'/>
      </template>
    </VPContent>
    <VPFooter />
  </div>
</v-app>
</template>