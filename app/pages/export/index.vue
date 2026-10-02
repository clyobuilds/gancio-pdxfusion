<script setup lang='ts'>
const route = useRoute()
const settings = useState<Settings>('settings')
const { t } = useI18n()

useHead({
  title: settings.value.title + ' - ' + t('common.share')
})

const type = ref(route?.hash || 'feed')
const list = reactive({
  title: settings.value.title,
  maxEvents: 3,
  theme: 'dark',
  sidebar: 'true',
  show_more: 'true',
  max_height: '500px'
})

const filters = reactive({ tags: [], places: [], collection: undefined, show_recurrent: settings.value.recurrent_event_visible })

const code = computed(() => {
  const params = [`baseurl="${settings.value.baseurl}"`]

  if (list.title && list.sidebar === 'true') {
    params.push(`title="${list.title}"`)
  }

  if (filters.collection) {
    params.push(`collection="${filters.collection}"`)
  } else {
    if (filters.places.length) {
      params.push(`places="${filters.places.join(',')}"`)
    }

    if (filters.tags.length) {
      params.push(`tags="${filters.tags.join(',')}"`)
    }
  }

  if (filters.show_recurrent) {
    params.push(`show_recurrent="${filters.show_recurrent}"`)
  }

  if (list.maxEvents) {
    params.push('maxlength=' + list.maxEvents)
  }

  params.push(`show_more="${list.show_more}"`)
  params.push(`sidebar="${list.sidebar}"`)
  params.push(`theme="${list.theme}"`)

  // eslint-disable-next-line no-useless-escape
  return `<script src="${settings.value.baseurl}/gancio-events.es.js"><\/script>\n<gancio-events ${params.join(' ')}></gancio-events>\n\n`
})

const link = computed(() => {
  const typeMap = { feed: 'rss', ical: 'ics' }
  const params = []

  if (filters.collection) {
    return `${settings.value.baseurl}/feed/${typeMap[type.value]}/collection/${encodeURIComponent(filters.collection)}`
  } else {
    if (filters.tags.length) {
      params.push(`tags=${filters.tags.map(encodeURIComponent).join(',')}`)
    }

    if (filters.places.length) {
      params.push(`places=${filters.places.join(',')}`)
    }
  }

  if (filters.show_recurrent) {
    params.push('show_recurrent=true')
  }

  return `${settings.value.baseurl}/feed/${typeMap[type.value]}${params.length ? '?' : ''}${params.join('&')}`
})

</script>

<template>
<v-container class='pa-0 pa-md-3'>
  <div>
    <v-card-title>{{$t('common.share')}}</v-card-title>
    <v-card-subtitle> {{$t('export.intro')}}</v-card-subtitle>
    <v-card-title class='mt-4'> {{$t('export.filter_title')}}</v-card-title>
    <v-card-subtitle> {{$t('export.filter_description')}}</v-card-subtitle>
    <v-card-text>
      <CoreFilter v-model='filters' />
    </v-card-text>

    <v-tabs v-model='type'>
      <v-tab href='#feed' value='feed'> {{$t('common.feed')}}</v-tab>
      <v-tab href='#ical' value='ical'> {{$t('export.ical_title')}}</v-tab>
      <v-tab href='#list' value='list'> {{$t('export.list_title')}}</v-tab>
      <v-tab v-if='settings.enable_federation' href='#federation' value='federation'> {{$t('common.fediverse')}}</v-tab>
    </v-tabs>
    <!-- //- TOFIX
      //- v-tab {{$t('common.email')}}
      //- v-tab-item
        v-card
          v-card-text
            p(v-html='$t(`export.email_description`)')
            v-switch.mt-0(inset :label="$t('notify_on_insert')")
            v-switch.mt-0(inset :label="$t('morning_notification')")
            v-text-field(v-model='notification.email' :placeholder="$t('export.insert_your_address')" ref='email')
              v-btn(slot='prepend' text color='primary' @click='add_notification') {{$t('common.send')}} <v-icon>mdi-email</v-icon> -->

    <v-card-text>
      <v-tabs-window v-model='type'>

        <v-tabs-window-item id='feed' value="feed">
          <v-card-text>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <section v-html='$t(`export.feed_description`)' />
            <v-text-field v-model="link" readonly>
              <template #prepend>
                <v-btn variant='text' color="primary" append-icon='mdi-content-copy' @click="$copyToClipboard(link)">
                  {{$t("common.copy")}}
                </v-btn>
              </template>
            </v-text-field>
          </v-card-text>
        </v-tabs-window-item>

        <v-tabs-window-item id='ical' value='ical'>
          <v-card-text>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <section v-html='$t(`export.ical_description`)' />
            <v-text-field v-model="link">
              <template #prepend>
                <v-btn variant='text' color="primary" append-icon='mdi-content-copy' @click="$copyToClipboard(link)">
                  {{$t("common.copy")}}
                </v-btn>
              </template>
            </v-text-field>
          </v-card-text>
        </v-tabs-window-item>

        <!-- <v-tab> {{$t('export.list_title')}}</v-tab> -->
        <v-tabs-window-item id='list' value='list'>
          <v-card-text>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p v-html='$t(`export.list_description`)' />

            <v-row>
              <v-col class="col-12 col-lg-4">
                <v-text-field v-model="list.title" :label="$t('common.title')"/>
                <v-text-field v-model="list.maxEvents" type="number" min="1" :label="$t('common.max_events')"/>
                <v-switch v-model="list.theme" hide-details :true-value="'dark'" :false-value="'light'" :label="$t('admin.is_dark')"/>
                <v-switch v-model="list.sidebar" hide-details :true-value="'true'" :false-value="'false'" :label="$t('admin.widget')"/>
                <v-switch v-model="list.show_more" hide-details :true-value="'true'" :false-value="'false'" :label="$t('export.show_more')"/>
                <v-text-field v-model="list.max_height" :label="$t('export.max_height')"/>
              </v-col>
              <v-col class='col-12.col-lg-8'>
                <gancio-events
                  :baseurl='settings.baseurl'
                  :maxlength='list.maxEvents &&  Number(list.maxEvents)'
                  :title='list.title'
                  :theme='list.theme'
                  :collection='filters.collection'
                  :places='filters.places.join(",")'
                  :tags='filters.tags.join(",")'
                  :show_recurrent='filters.show_recurrent'
                  :show_more="list.show_more"
                  :max_height="list.max_height"
                  :sidebar="list.sidebar" />
              </v-col>
            </v-row>
            <v-alert class="pa-5 my-4 bg-blue-grey-darken-4 text-body-1 text-lime-lighten-3">
              <pre>{{code}}</pre>
              <v-btn class="float-end" variant='text' append-icon='mdi-content-copy' color="primary" @click="$copyToClipboard(code)">
                {{$t("common.copy")}}
              </v-btn>
            </v-alert>
          </v-card-text>
        </v-tabs-window-item>

        <v-tabs-window-item v-if='settings.enable_federation' id='federation' value='federation'>
          <FollowMe />
        </v-tabs-window-item>
        <!-- //- TOFIX
        //- v-tab.pt-1(label='calendar' name='calendar')
        //- v-tab-item
        //-   p(v-html='$t(`export.calendar_description`)')
        //-   //- no-ssr
        //-     Calendar.mb-1
        //-   v-text-field.mb-1(type='textarea' v-model='script')
        //-   el-button.float-right(plain type="primary" icon='el-icon-document') Copy -->
      </v-tabs-window>
    </v-card-text>
  </div>
</v-container>
</template>
