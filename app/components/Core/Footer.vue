<script setup lang="ts">

const settings = useState<Settings>('settings')

const config = useRuntimeConfig()
const { t } = useI18n()
const showFollowMe = ref<boolean>(false)
const goHome = useGoHome()

const { data: trusted_sources } = await useLazyFetch('/api/ap_actors/trusted', {
  immediate: !!settings.value.enable_federation,
  server: false,
})

const footerLinks = computed(() => settings.value.footerLinks?.map((link) => {
  if (/^https?:\/\//.test(link.href)) {
    return { href: link.href, label: link.label.startsWith('common.') ? t(link.label) : link.label }
  } else {
    return { to: link.href, label: link.label.startsWith('common.') ? t(link.label) : link.label }
  }
}))

</script>
<template>
<v-footer id='footer' color='surface' border aria-label='Footer' class="flex-grow-0 py-3 flex-wrap flex-column flex-sm-row" >

  <!-- follow me dialog -->
  <v-dialog v-model='showFollowMe' destroy-on-close max-width='700px' :fullscreen='$vuetify.display?.mobile'>
    <LazyFollowMe is-dialog @close='showFollowMe=false' />
  </v-dialog>

  <!-- footer links -->
  <v-btn
    v-for="link in footerLinks" :key="link?.label" color="primary" class="ml-1"
    :href="link?.href" :to="link?.to" :target="link?.href && '_blank'"
    @click="link?.to === '/' && goHome($event)">{{ $t(link?.label) }}</v-btn>

  <!-- trusted sources -->
  <v-menu
    v-if="settings.enable_federation && trusted_sources?.length"
    transition="slide-y-transition">
    <template #activator="{ props }">
      <v-btn class="ml-1" v-bind="props" color="primary">{{ settings.trusted_sources_label || $t('admin.trusted_sources_label_default') }}</v-btn>
    </template>
    <v-list lines="two" max-height="300" max-width="550">
      <v-list-item
        v-for='instance in trusted_sources'
        :key="instance.ap_id"
        lines="two"
        target="_blank"
        :href="instance.url ?? instance.ap_id"
        :prepend-avatar="instance.icon"
      >
        <v-list-item-title>{{ instance.name ?? instance.preferredUsername }}</v-list-item-title>
        <v-list-item-subtitle>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="instance?.summary" />
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-menu>

  <v-btn v-if="settings.enable_federation" class="ml-1" color="primary" rel="me" @click.prevent="showFollowMe=true">{{ $t('event.interact_with_me') }}</v-btn>
  <v-spacer />
  <v-btn color="primary" href="https://gancio.org" target="_blank" rel="noopener"> Gancio <small>{{ config.public.version }}</small></v-btn>
</v-footer>
</template>
