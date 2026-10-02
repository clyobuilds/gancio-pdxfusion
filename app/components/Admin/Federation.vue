<script setup lang='ts'>
import { getFetchError } from '../../utils/helpers'
const { $notify, $confirm } = useNuxtApp()
const { t } = useI18n()

const headers = [
  { value: 'logo', title: 'Logo', width: 60, sortable: false },
  { value: 'name', title: 'Name' },
  { value: 'info', title: 'Info' },
  { value: 'following', title: 'Following' },
  { value: 'follower', title: 'Follower' },
  { value: 'actions', title: 'Actions', align: 'end', sortable: false }
]

const { data: stats } = useFetch('/api/ap_actors/stats')
const { data: trusted_sources, refresh } = await useFetch('/api/ap_actors/trusted', { deep: true })

const form = ref()
const source_url = ref('')
// const instance_name = ref(settings.value.instance_name)
const dialogAddTrustedSource = ref(false)
const loading = ref(false)
const valid = ref(false)

const enable_resources = manageSetting('enable_resources')
const enable_federation = manageSetting('enable_federation')
const enable_federation_quoting = manageSetting('enable_federation_quoting')
const federated_events_in_home = manageSetting('federated_events_in_home')
const default_fedi_hashtags = manageSetting('default_fedi_hashtags')
const hide_boosts = manageSetting('hide_boosts')
const trusted_sources_label = manageSetting('trusted_sources_label')

async function toggleFollowing (trusted_source: APUser) {
  try {
    trusted_source.loading = true
    await $fetch('/api/ap_actors/follow', { method: 'PUT', body: { ap_id: trusted_source.ap_id } })
    $notify('common.ok', Statuses.SUCCESS)
    refresh()
  } catch (e) {
    $notify(String(e), Statuses.ERROR)
  }
  trusted_source.loading = false
  refresh()
}

async function createTrustedInstance () {
  loading.value = true
  const { valid } = await form.value.validate()
  if (!valid) {
    return
  }
  try {
    source_url.value = source_url.value.replace(/\/$/, '')
    await $fetch('/api/ap_actors/add_trust', { method: 'POST', body: { url: source_url.value } })
    refresh()
    dialogAddTrustedSource.value = false
  } catch (e) {
    $notify(getFetchError(e), Statuses.ERROR)
  }
  loading.value = false
}

async function deleteTrustedSource (trusted_source: APUser) {
  const ret = await $confirm('admin.delete_trusted_source_confirm')
  if (!ret) {
    return
  }
  try {
    await $fetch('/api/ap_actors/trust', { method: 'DELETE', body: { ap_id: trusted_source.ap_id } })
    $notify('admin.trusted_source_removed', Statuses.SUCCESS)
    refresh()
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}
</script>

<template>
<div class="d-flex flex-column ga-12 mt-4">
  <div>
    <v-switch
      v-model="enable_federation"
      class="mt-0"
      :label="$t('admin.enable_federation')"
      persistent-hint
      :hint="$t('admin.enable_federation_help')"
    />

    <template v-if="enable_federation">
      <v-switch
        v-model="federated_events_in_home"
        class="mt-4"
        :label="$t('admin.federated_events_in_home')"
        :hint="$t('admin.federated_events_in_home_help')"
        persistent-hint
      />

      <v-switch
        v-model="enable_federation_quoting"
        class="mt-4"
        :label="$t('admin.enable_federation_quoting')"
        :hint="$t('admin.enable_federation_quoting_help')"
        persistent-hint
      />

      <v-switch
        v-model="enable_resources"
        class="mt-4"
        :label="$t('admin.enable_resources')"
        :hint="$t('admin.enable_resources_help')"
        persistent-hint
      />

      <v-switch
        v-model="hide_boosts"
        class="mt-4"
        :label="$t('admin.hide_boost_bookmark')"
        :hint="$t('admin.hide_boost_bookmark_help')"
        persistent-hint
      />

      <!--
      <v-text-field
        class="mt-5"
        v-model="instance_name"
        :label="$t('admin.instance_name')"
        :hint="`${$t('admin.instance_name_help')} ${instance_ap_url}`"
        placeholder="Instance name"
        persistent-hint
        @blur="save('instance_name', instance_name)"
      ></v-text-field>
      -->
    </template>

    <v-combobox
      v-model="default_fedi_hashtags"
      class="mt-4"
      prepend-icon="mdi-tag-multiple"
      :label="$t('admin.default_fedi_hashtags')"
      persistent-hint
      multiple
      :delimiters="[';', ',']"
      chips
      closable-chips
      :hint="$t('admin.default_fedi_hashtags_help')"
    />

    <v-text-field
      v-model="trusted_sources_label"
      class="mt-4"
      :label="$t('admin.trusted_sources_label')"
      persistent-hint
      :placeholder="$t('admin.trusted_sources_label_default')"
      :hint="$t('admin.trusted_sources_label_help')"
    />

    <v-dialog v-model="dialogAddTrustedSource" width="500px" :fullscreen="$vuetify.display?.mobile">
      <v-card>
        <v-card-title>{{ $t('admin.add_trusted_source') }}</v-card-title>
        <!-- eslint-disable-next-line -->
        <v-card-subtitle class="mt-2 text-wrap" v-html="$t('admin.add_trusted_source_help')"/>
        <v-card-text>
          <v-form ref="form" v-model="valid" @submit.prevent="createTrustedInstance">
            <v-text-field
              v-model="source_url"
              class="mt-4"
              persistent-hint
              :rules="[$valid.required('common.url')]"
              :loading="loading"
              :hint="$t('admin.add_trusted_source')"
              :label="$t('common.url')"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant='outlined' color="error" @click="dialogAddTrustedSource=false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            variant='outlined'
            color="primary"
            :disabled="!valid || loading"
            :loading="loading"
            @click="createTrustedInstance"
          >{{ $t('common.ok') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn class="mt-4" color="primary" variant="text" prepend-icon='mdi-plus' @click="dialogAddTrustedSource = true">
      {{ $t('admin.add_source') }}
    </v-btn>

    <v-data-table
      v-if="trusted_sources?.length"
      density="compact"
      :hide-default-footer="trusted_sources?.length<10"
      :headers="headers"
      :items="trusted_sources"
    >
      <template v-slot:item.logo="{ item }">
        <v-img height="20" width="20" :src="item?.icon"/>
      </template>
      <template v-slot:item.name="{ item }">
        <a :href="item.url">{{ item.name }}</a><br>
        <span>
          @{{ item?.preferredUsername }}@{{ item?.domain }}<br>
          <v-chip color="primary" density="compact" class='mb-1' variant="flat">{{ item?.software?.name }} {{ item?.software?.version }}</v-chip>
        </span>
      </template>
      <template v-slot:item.info="{ item }">
        <!-- eslint-disable-next-line -->
        <small v-html="item.summary" />
      </template>
      <template v-slot:item.following="{ item }">
        <v-switch
          :model-value="item.following"
          :disabled="item.loading"
          :loading="item.loading"
          hide-details
          @update:model-value="() => toggleFollowing(item)"
        />
      </template>
      <template v-slot:item.follower="{ item }">
        <v-icon v-if="item.following" icon="mdi-download" />
        <v-icon v-if="item.follower" icon="mdi-upload" />
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon='mdi-delete-forever' color="error" @click="deleteTrustedSource(item)" />
      </template>
    </v-data-table>
  </div>

  <div>
    <div class="text-h5 mb-2">Stats</div>
    <span class="text-body-1">{{ $t('admin.stats', stats) }}</span>
  </div>
</div>

</template>
