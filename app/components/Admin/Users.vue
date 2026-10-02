<script setup>
const { $notify, $confirm } = useNuxtApp()
const { user: loggedUser } = useUserSession()
const { t } = useI18n()

const { data: users, refresh } = await useFetch('/api/users')
const search = ref('')
const roleColors = { admin: 'error', editor: 'warning', user: 'success' }

const headers = [
  { key: 'email', title: t('common.email'), width: 150 },
  { key: 'description', title: t('common.description') },
  { key: 'is_active', align: 'center', title: t('common.enabled'), width: 20 },
  { key: 'to_notify', align: 'center', title: t('admin.notify'), width: 150 },
  { key: 'role', title: t('common.role'), width: 150 },
  { key: 'actions', title: t('common.actions'), align: 'end', width: 180, sortable: false }
]

async function deleteUser (user) {
  const ret = await $confirm('admin.delete_user_confirm', { user: user.email })
  if (!ret) {
    return
  }
  try {
    await $fetch(`/api/user/${user.id}`, { method: 'DELETE' })
    refresh()
    $notify('admin.user_remove_ok')
  } catch (e) {
    $notify(e, Statuses.ERROR)
  }
}

const editUserDialog = ref(false)
const selectedUser = ref()
async function editUser (user) {
  selectedUser.value = structuredClone(toRaw(user))
  editUserDialog.value = true
}

async function createUser () {
  selectedUser.value = undefined
  editUserDialog.value = true
}
</script>

<template>
<div>
  <div class="d-flex align-center justify-end flex-wrap ga-4 mb-4">
    <v-btn color="primary" variant='text' append-icon='mdi-plus' @click="createUser">
      {{$t('common.new_user')}}
    </v-btn>
    <CoreSearchInput v-model="search" class="w-100 w-sm-auto" />
  </div>

  <AdminUserEdit :key="selectedUser?.id ?? 'new'" v-model="editUserDialog" :user="selectedUser" @refresh='refresh' />

  <div>
    <!-- USERS LIST -->
    <v-data-table
      v-if='users'
      :headers="headers"
      :items="users"
      :search="search"
      :hide-default-footer="users.length<5"
    >
      <template v-slot:item.is_active="{item}">
        <v-icon :icon="item.is_active ? 'mdi-check' : 'mdi-close'" :color="item.is_active ? 'success': 'warning' "/>
      </template>
      <template v-slot:item.to_notify="{item}">
        <v-icon v-if='item.role !== "user"' :icon="item.to_notify ? 'mdi-check' : 'mdi-close'" :color="item.to_notify ? 'success': 'warning' "/>
      </template>
      <template #[`item.role`]="{item}">
        <v-chip :color="roleColors[item.role]" variant='outlined' label density='compact'>{{item.role}}</v-chip>
      </template>
      <template #[`item.actions`]="{item}">
        <t-btn
          color="success"
          :tooltip="$t('common.edit')"
          icon='mdi-pencil'
          @click="editUser(item)"
        />
        <t-btn
          v-if="item.id !== loggedUser.id"
          color="error"
          :tooltip="$t('admin.delete_user')"
          icon='mdi-delete-forever'
          @click="deleteUser(item)"
        />
      </template>
    </v-data-table>
  </div>
</div>
</template>
