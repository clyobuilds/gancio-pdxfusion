<script setup lang="ts">
import type { Paginated } from '~~/server/types/pagination'
import SearchInput from '../Core/SearchInput.vue'
import { useDisplay } from 'vuetify'

const { t } = useI18n()
const { $confirm } = useNuxtApp()

const { smAndDown: isMobile } = useDisplay()

const instancesHeader = computed(() => [
  { value: 'name', title: t('common.name'), sortable: true },
  { value: 'users', align: 'center', width: 64, sortable: true },
  { value: 'blocked', align: 'center', width: 64, sortable: true }
] as const)

const instancesFilter = ref<string>('')
const selectedInstance = ref<string | undefined>()

function onInstanceRowClick (_, row) {
  const domain = row.item.domain
  selectedInstance.value = selectedInstance.value === domain ? undefined : domain
  usersTable.value?.$el.scrollIntoView({ behavior: 'smooth' })
}

const usersHeader = computed(() => [
  { value: 'preferredUsername', title: t('common.name'), sortable: true },
  { value: 'blocked', align: 'center', width: 64, sortable: true }
] as const)

const usersFilter = ref<string>('')
const usersTable = ref()

const { data: instances = [], refresh: refreshInstances } = await useFetch('/api/instances')
const { data: users = [], refresh: refreshUsers } = await useFetch(`/api/ap_actors`, {
  query: { instance: selectedInstance }
})

const searchResources = ref('')
const resourcesPage = ref(1)
const { data: resourcesData, refresh: refreshResources } = await useFetch<Paginated<Resource>>('/api/resources/list', {
  query: { page: resourcesPage, pageSize: 10, query: searchResources }
})
watch(searchResources, () => {
  resourcesPage.value = 1
}, { immediate: true })

async function toggleUserBlock (ap_user) {
  if (!ap_user.blocked) {
    const ret = await $confirm('admin.user_block_confirm', { user: `@${ap_user.preferredUsername}@${ap_user.domain}` })
    if (!ret) {
      return
    }
  }
  await $fetch('/api/ap_actors/toggle_block', { method: 'PUT', body: { ap_id: ap_user.ap_id } })
  refreshUsers()
}

async function toggleInstanceBlock (instance) {
  if (!instance.blocked) {
    const ret = await $confirm('admin.instance_block_confirm', { instance: instance.domain })
    if (!ret) {
      return
    }
  }
  await $fetch('/api/instances/block', { method: 'PUT', body: { domain: instance.domain, blocked: !instance.blocked } })
  refreshInstances()
}
</script>

<template >
<div class="mt-4">
  <v-row class="mt-4">
    <v-col :cols="12" :lg="6">
      <div class="text-h5 mb-4">{{ $t('common.instances') }}</div>
      <SearchInput v-model="instancesFilter" :label="$t('admin.filter_instances')" class="mb-2" />
      <v-data-table
        :items="instances"
        :items-per-page="5"
        :hide-default-footer="!instances || instances.length < 5"
        :search="instancesFilter"
        :sort-by="[{ key: 'blocked', order: 'desc' }, { key: 'name' }]"
        density="compact"
        class="table-ultra-compact"
        :headers="instancesHeader"
        item-value="domain"
        :row-props="(data) => ({ class: { 'row-selected': selectedInstance === data.item.domain } })"
        @click:row="onInstanceRowClick"
      >
        <template #item.name="{ item }">
          <div class="font-weight-semibold">{{ item.name }}</div>
          <NuxtLink :to="`https://${item.domain}`" target="_blank">{{ item.domain }}</NuxtLink>
        </template>
        <template #item.users="{ item }">
          <v-btn :title="t('admin.known_users')" prepend-icon="mdi-account-multiple-outline">
            {{ item.users }}
          </v-btn>
        </template>
        <template #item.blocked="{ item }">
          <v-btn
            :icon="item.blocked ? 'mdi-cancel' : 'mdi-checkbox-blank-circle-outline'"
            :title="item.blocked ? t('admin.blocked') : t('admin.block')"
            :color="item.blocked ? 'error' : undefined"
            @click.stop="toggleInstanceBlock(item)"
          />
        </template>
      </v-data-table>
    </v-col>

    <v-col ref="usersTable" :cols="12" :lg="6">
      <div class="text-h5 mb-4">{{ $t('common.users') }}</div>
      <SearchInput v-model="usersFilter" :label="$t('admin.filter_users')" class="mb-2" />
      <v-data-table
        :items="users"
        :items-per-page="5"
        :hide-default-footer="!users || users.length < 5"
        :search="usersFilter"
        :sort-by="[{ key: 'blocked', order: 'desc' }, { key: 'name' }]"
        density="compact"
        class="table-ultra-compact"
        :headers="usersHeader"
      >
        <template v-slot:item.preferredUsername="{ item }">
          <div class="font-weight-semibold">{{ item.name }}</div>
          <div>{{ `@${item.preferredUsername}@${item.domain}` }}</div>
        </template>
        <template #item.blocked="{ item }">
          <v-btn
            :icon="item.blocked ? 'mdi-cancel' : 'mdi-checkbox-blank-circle-outline'"
            :title="item.blocked ? t('admin.user_blocked', { user: `@${item.preferredUsername}@${item.domain}` }) : t('admin.block_user')"
            :color="item.blocked ? 'error' : undefined"
            @click.stop="toggleUserBlock(item)"
          />
        </template>
      </v-data-table>
    </v-col>
  </v-row>

  <v-divider class="my-8"/>

  <div>
    <div class="d-flex align-center justify-space-between flex-wrap ga-4 mb-4">
      <div class="text-h5">{{ $t('common.resources') }}</div>
      <CoreSearchInput v-model.debounce="searchResources" class="w-100 w-sm-auto" />
    </div>

    <div v-if="resourcesData?.data" class="d-flex flex-column ga-2 mb-4">
      <template v-for="resource, idx of resourcesData?.data" :key="resource.activitypub_id">
        <div>
          <nuxt-link
            class="text-subtitle-1 font-weight-semibold text-decoration-none d-inline-flex align-center ga-2"
            :to="`/event/${resource.event!.slug || resource.event!.id}`"
          >
            <v-icon icon="mdi-calendar" size="xSmall" />
            <span>{{ resource.event!.title }}</span>
          </nuxt-link>
          <FederationResource :resource="resource" can-moderate :event-id="resource.event!.id" @update="refreshResources()" />
        </div>
        <v-divider v-if="idx + 1 < resourcesData?.data.length" variant="dashed" />
      </template>
    </div>

    <div v-if="resourcesData?.totalPages && resourcesData.totalPages > 1" class="mt-6">
      <v-pagination
        v-model="resourcesPage"
        :length="resourcesData.totalPages"
        :total-visible="isMobile ? 1 : 6"
        show-first-last-page
      />
    </div>
  </div>

</div>
</template>
<style lang="css" scoped>
.table-ultra-compact :deep(th),
.table-ultra-compact :deep(td)
{
  padding-inline-end: 0 !important;
}

:deep(.row-selected) {
  background: rgba(var(--v-theme-on-surface), calc(var(--v-hover-opacity) * var(--v-theme-overlay-multiplier)));
  transition: background-color 0.2s ease-in-out
}
</style>
