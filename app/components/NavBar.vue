<script setup>
const settings = useState('settings')
const { loggedIn } = useUserSession()
</script>
<template>
<div id="navbar" class='d-flex justify-space-between justify-sm-center ga-2 px-2 mt-4'>
  <v-btn
    v-if='loggedIn || settings.allow_anon_event'
    to='/add'
    :aria-label="$t('common.add_event')"
    variant='text'
    class="icon-button px-3 px-sm-4"
  >
    <span class='me-1'>{{$t('common.add_event')}}</span>
    <v-icon color='primary' icon='mdi-plus' />
  </v-btn>
  <v-btn
    to='/export'
    :aria-label="$t('common.share')"
    variant='text'
    class="icon-button px-3 px-sm-4"
  >
    <span class='d-none d-sm-block me-1'>{{$t('common.share')}}</span>
    <v-icon icon='mdi-share-variant' />
  </v-btn>
</div>
</template>
<style scoped>
.icon-button {
  min-width: 0;
}
</style>
