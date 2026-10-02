<script setup>
const { t } = useI18n()
const { $confirm, $notify } = useNuxtApp()

const loading = ref(false)
const dialog = ref(false)
const valid = ref(false)
const collection = ref({ name: '', id: null })
const filterTags = ref([])
const filterPlaces = ref([])
const filterActors = ref([])
const negateFilter = ref(false)
const filters = ref([])
// const tagName = ref('')
// const placeName = ref('')
const editFilterId = ref(false)
const form = ref()

const collectionHeaders = [
  { value: 'name', title: t('common.name') },
  // { value: 'filters', title: t('common.filter') },
  { value: 'pin', title: t('common.pin'), align: 'end', sortable: false },
  { value: 'actions', title: t('common.actions'), align: 'end', width: 180, sortable: false }
]

const filterHeaders = [
  { value: 'negate', title: '', width: 20, sortable: false },
  { value: 'actors', title: t('common.actors') },
  { value: 'tags', title: t('common.tags') },
  { value: 'places', title: t('common.places') },
  { value: 'actions', title: t('common.actions'), align: 'end', sortable: false }
]
const settings = useState('settings')

const in_home = ref(!!settings.value?.collection_in_home)
const { data: collections, refresh } = await useFetch('/api/collections?withFilters=true')

function newCollection() {
  collection.value = { name: '', id: null }
  filters.value = []
  dialog.value = true
}

async function saveCollection() {
  const { valid } = await form.value.validate()
  if (!valid) {
    return
  }
  loading.value = true
  collection.value.name = collection.value.name.trim()
  try {
    collection.value = await $fetch('/api/collections', { method: 'POST', body: collection.value })
    refresh()
  } catch (e) {
    $notify(String(e), Statuses.ERROR)
  }
  loading.value = false
}

async function removeCollection(collection) {
  const ret = await $confirm('admin.delete_collection_confirm', { collection: collection.name })
  if (!ret) {
    return
  }
  try {
    await $fetch(`/api/collections/${collection.id}`, { method: 'DELETE' })
    $notify('common.ok')
    refresh()
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function editCollection(c) {
  collection.value = { ...c }
  filters.value = await $fetch(`/api/collections/filters/${collection.value.id}`)
  dialog.value = true
}

const collection_in_home = manageSetting('collection_in_home')

async function addFilter() {
  loading.value = true
  const tags = filterTags.value
  const places = filterPlaces.value.map(p => ({ id: p.id, name: p.name }))
  const actors = filterActors.value.map(a => ({ ap_id: a.ap_id, name: a.object?.preferredUsername ?? a.object?.username ?? a?.name, domain: a?.instanceDomain ?? a.domain }))
  const filter = { collectionId: collection.value.id, tags, places, actors, negate: negateFilter.value }

  // tags and places are JSON field and there's no way to use them inside a unique constrain
  // const alreadyExists = false
  // filters.value.find(f =>
  //   isEqual(sortBy(f.places, 'id'), sortBy(filter.places, 'id')) &&
  //   isEqual(sortBy(f.tags), sortBy(filter.tags)) &&
  //   isEqual(sortBy(f.actors), sortBy(filter.actors))
  // )
  try {
    if (editFilterId.value !== false) {
      await $fetch(`/api/filters/${editFilterId.value}`, { body: filter, method: 'PUT' })
    } else {
      // if (alreadyExists) {
      //     this.$root.$message('Already exists', { color: 'warning' })
      //     loading.value = false
      //     return
      //   }
      //   await this.$axios.$post('/filter', filter )
      await $fetch('/api/filters', { body: filter, method: 'POST' })
    }
  } catch (e) {
    loading.value = false
    $notify(String(e), Statuses.ERROR)
  }
  refresh()
  filters.value = await $fetch(`/api/collections/filters/${collection.value.id}`)
  filterTags.value = []
  filterPlaces.value = []
  filterActors.value = []
  negateFilter.value = false
  editFilterId.value = false
  loading.value = false
}

// watch: {
//   in_home (val) {
//     this.collection_in_home = null
//   }
// },
// methods: {
// searchTags: debounce(async function (ev) {
//   this.tags = await this.$axios.$get(`/tag?search=${encodeURIComponent(ev.target.value)}`)
// }, 100),
// searchPlaces: debounce(async function (ev) {
//   this.places = await this.$axios.$get(`/place?search=${ev.target.value}`)
// }, 100),

//     newCollection() {
//       this.collection = { name: '', id: null }
//       this.filters = []
//       this.dialog = true
//     },

async function togglePinCollection (collection) {
  try {
    await $fetch(`/api/collections/toggle/${collection.id}`, { method: 'PUT' })
    refresh()
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

async function moveUp (collection) {
  try {
    await $fetch(`/api/collections/moveup/${collection.sortIndex}`, { method: 'PUT' })
    refresh()
  } catch (e) {
    // const err = get(e, 'response.data.errors[0].message', e)
    // this.$root.$message(this.$t(err), { color: 'error' })
    $notify(String(e), Statuses.ERROR)
  }
}

async function editFilter(filter) {
  filterActors.value = filter.actors
  filterPlaces.value = filter.places
  filterTags.value = filter.tags
  negateFilter.value = filter.negate
  editFilterId.value = filter.id
}

async function removeFilter(filter) {
  loading.value = true
  try {
    await $fetch(`/api/filters/${filter.id}`, { method: 'DELETE' })
    filters.value = filters.value.filter(f => f.id !== filter.id)
  } catch (e) {
    $notify(t(e?.response?.data?.errors?.[0]?.message), Statuses.ERROR)
  }
  loading.value = false
}

const searchTags = ref('')
const { data: tags } = await useFetch('/api/tags', { query: { query: searchTags } })

const searchPlaces = ref('')
const { data: places } = await useFetch('/api/places', { query: { query: searchPlaces } })

// get trusted AP actors adding myself
const { data: actors } = await useFetch('/api/ap_actors/trusted', { transform: ret => [{ ap_id: null }, ...ret] })

</script>
<template>
<div>
  <div class="d-flex flex-column ga-4">
    <div class="text-subtitle-2 text-medium-emphasis">{{$t('admin.collections_description')}}</div>

    <div v-if="collections.length" class="d-flex flex-wrap ga-4 justify-space-between align-center">
      <v-switch
        v-model="in_home"
        :label="$t('common.collection_in_home')"
        hide-details
        @update:model-value="collection_in_home = null"
      />
      <div class="w-100 w-sm-50">
        <v-autocomplete
          v-if="in_home"
          v-model="collection_in_home"
          density='compact'
          variant='outlined'
          :label="$t('common.collections')"
          hide-details
          color="primary"
          hide-selected
          :menu-props="{ maxWidth: '400' }"
          :items="collections"
          hide-no-data
          clearable
          item-title="name"
        />
      </div>
    </div>

    <div class="d-flex justify-end">
      <v-btn color="primary" variant='text' prepend-icon='mdi-plus' @click="newCollection">
        {{ $t('admin.new_collection') }}
      </v-btn>
    </div>

    <v-dialog
      v-model="dialog"
      max-width="1200"
      width="1000"
      destroy-on-close
      :fullscreen="$vuetify.display?.mobile"
    >
      <v-card>
        <v-card-title class="bg-primary">
          {{ $t(!collection.id ? 'admin.new_collection' : 'admin.edit_collection') }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid" @submit.prevent="saveCollection">
            <v-text-field
              v-if="!collection.id"
              v-model="collection.name"
              :rules="[$valid.required('common.name')]"
              :label="$t('common.name')"
              :placeholder="$t('common.name')"
            >
              <template v-if="!collection.id" #append>
                <v-btn
                  variant='outlined'
                  color="primary"
                  :loading="loading"
                  :disabled="!valid || loading || !!collection.id"
                  @click="saveCollection"
                >
                  {{ $t('common.save') }}
                </v-btn>
              </template>
            </v-text-field>
            <h3 v-else class="text-h6" v-text="collection.name" />
          </v-form>

          <v-row>
            <v-col cols="6">
              <v-autocomplete
                v-model="filterActors"
                prepend-inner-icon="mdi-web"
                chips
                multiple
                closable-chips
                hide-no-data
                hide-selected
                persistent-hint
                :disabled="!collection.id"
                placeholder="Local"
                return-object
                item-id='ap_id'
                item-title='ap_id'
                hide-details
                :delimiters="[';', ',']"
                :items="actors"
                :label="$t('common.trusted_sources')"
              >
                <template #item="{ item, props }">
                  <v-list-item
                    v-bind="props"
                    :prepend-avatar="format.actor(item.raw, 'icon')"
                    :title="format.actor(item.raw, 'title')"
                    :subtitle="format.actor(item.raw, 'label')"/>
                </template>
                <template #chip="{ item, props, selected }">
                  <v-chip
                    v-bind="props"
                    closable
                    :model-value="selected"
                    size='small'
                  >
                    {{ format.actor(item.raw, 'label') }}
                  </v-chip>
                </template>
              </v-autocomplete>
            </v-col>

            <v-col cols="6">
              <v-autocomplete
                v-model="filterPlaces"
                prepend-inner-icon="mdi-map-marker"
                chips
                multiple
                closable-chips
                hide-no-data
                hide-selected
                persistent-hint
                auto-select-first
                clearable
                return-object
                hide-details
                item-title="name"
                :disabled="!collection.id"
                :delimiters="[';', ',']"
                :items="places"
                :label="$t('common.places')"
                @update:model-value="searchPlaces"
                @focus="searchPlaces"
              />
              <!-- <template
                  #chip="{ item, attrs, selected, parent }">
                  <v-chip
                    v-bind="attrs"
                    closable
                    @click:close="parent.selectItem(item)"
                    :model-value="selected"
                    label
                    size='small'
                  >
                    {{ item.name }}
                  </v-chip>
                </template> -->
              <!-- </v-autocomplete> -->
            </v-col>

            <v-col cols="6">
              <v-combobox
                v-model="filterTags"
                v-model:search="searchTags"
                prepend-inner-icon="mdi-tag-multiple"
                chips
                multiple
                closable-chips
                hide-no-data
                hide-selected
                persistent-hint
                :disabled="!collection.id"
                hide-details
                placeholder="All"
                :delimiters="[';', ',']"
                :items="tags"
                :label="$t('common.tags')"
              >
                <!-- <template v-slot:selection="{ item, attrs, selected, parent }">
                  <v-chip
                    v-bind="attrs"
                    closable
                    @click:close="parent.selectItem(item)"
                    :model-value="selected"
                    label
                    size='small'
                  >
                    {{ item }}
                  </v-chip>
                </template> -->
              </v-combobox>
            </v-col>

            <v-col cols="3">
              <v-switch
                v-model="negateFilter"
                :disabled="!collection.id"
                label="Not"
              />
            </v-col>
          </v-row>

          <v-data-table
            :headers="filterHeaders"
            :items="filters"
            :hide-default-footer="filters.length < 5"
          >
            <template v-slot:item.actions="{ item }">
              <v-btn color="primary" icon='mdi-pencil' @click="editFilter(item)" />
              <v-btn color="error" icon='mdi-delete-forever' @click="removeFilter(item)" />
            </template>
            <template v-slot:item.negate="{ item }">
              <v-icon
                :icon="item.negate ? 'mdi-not-equal-variant' : 'mdi-equal-box'"
                :color="item.negate ? 'warning' : 'success'"
              />
            </template>
            <template v-slot:item.tags="{ item }">
              <v-chip
                v-for="tag in item.tags"
                :key="tag"
                class="ma-1"
                size='small'
              >{{ tag }}</v-chip>
            </template>
            <template v-slot:item.places="{ item }">
              <v-chip
                v-for="place in item.places"
                :key="place.id"
                class="ma-1"
                size='small'
              >{{ place.name }}</v-chip>
            </template>
            <template v-slot:item.actors="{ item }">
              <v-chip
                v-for="actor in item.actors"
                :key="actor.ap_id"
                class="ma-1"
                size='small'
                label
              >
                {{ format.actor(actor, 'filter') }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="editFilterId === false"
            color="primary"
            variant='outlined'
            :loading="loading"
            :disabled="loading || filterActors.length<1 && filterPlaces.length<1 && filterTags.length<1"
            append-icon='mdi-plus'
            @click="addFilter"
          >
            {{ $t('common.add') }}
          </v-btn>

          <v-btn
            v-else
            color="primary"
            variant='outlined'
            :loading="loading"
            :disabled="loading || filterActors.length<1 && filterPlaces.length<1 && filterTags.length<1"
            @click="addFilter"
          >
            {{ $t('common.save') }}
          </v-btn>

          <v-btn
            variant='outlined'
            color="warning"
            :disabled="loading || filterActors.length>0 || filterPlaces.length>0 || filterTags.length>0"
            @click="dialog = false"
          >
            {{ $t('common.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <div>
      <v-data-table
        :headers="collectionHeaders"
        :items="collections"
        :hide-default-footer="collections.length < 5"
      >
        <template v-slot:item.pin="{ item }">
          <v-switch
            class="float-right"
            :model-value="item.isTop"
            hide-details
            @update:model-value="togglePinCollection(item)"
          />
        </template>
        <template v-slot:item.actions="{ item, index }">
          <v-btn v-if="index>0" color="warn" icon='mdi-chevron-up' @click.stop="moveUp(item)" />
          <v-btn color="primary" icon='mdi-pencil' @click="editCollection(item)" />
          <v-btn color="error" icon='mdi-delete-forever' @click="removeCollection(item)" />
        </template>
      </v-data-table>
    </div>
  </div>
</div>

</template>

<!-- <style>

/**  this is for the switch */
.v-data-table .v-input--selection-controls {
  margin-top: 0;
  padding-top: 0;
}
</style> -->
