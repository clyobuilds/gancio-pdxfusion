<script setup lang="ts">

const props = defineProps({ error: { type: Object, default: () => ({}) } })

let zodIssues = null

if (props?.error?.data?.name === 'ZodError') {
  zodIssues = JSON.parse(props?.error?.data?.message)
}
</script>

<template>
<NuxtLayout name="default">
  <v-container>
    <h1>{{ error?.message ?? error?.statusMessage ?? error?.statusText  }}</h1>

    <div v-if="zodIssues">
      <ul>
        <li v-for="issue in zodIssues" :key="issue.path.join('.')">
          <strong>{{ issue.path.join('.') }}:</strong>
          {{ issue.message }}
        </li>
      </ul>
    </div>

    <v-btn prepend-icon='mdi-arrow-left' to="/">{{ $t('common.home') }}</v-btn>
  </v-container>
</NuxtLayout>
</template>
