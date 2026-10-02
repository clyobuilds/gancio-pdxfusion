<script setup lang="ts">
const settings = useState<Settings>('settings')
const route = useRoute()

const show_calendar = computed(() => !settings.value?.hide_calendar && route?.name === 'index')
const show_collections_bar = computed(() => ['index', 'collection-name'].includes(route.name as string))

// this is needed because this is not an assets but could be changed by the users (server/routes/headerimage.png.ts)
const headerImage = 'url("/headerimage.png")'
</script>
<template>
<nav id='AppBar' class="pb-2">
  <NavHeader />

  <!-- title -->
  <component :is='$route.name === "index" ? "h1" : "div"' class="text-center">
    <nuxt-link id="title" color='primary' to="/">{{ settings?.title ?? 'Gancio'}}</nuxt-link>

    <!-- eslint-disable vue/no-v-html -->
    <div
      class="text-body-1 font-weight-light pb-3"
      v-html="settings?.description ?? 'a shared agenda for local communities'"
    />
    <!-- eslint-enable vue/no-v-html -->
  </component>

  <NavSearch v-show='show_collections_bar || show_calendar' />
  <NavBar v-if="!['event-slug','e-slug'].includes(route.name as string)"/>
</nav>
</template>
<style>
  nav#AppBar {
    background-image:
      linear-gradient(rgba(0,0,0,.8),hsla(0,0%,8%,.7)),
      v-bind(headerImage);
    /* background-position: center center; */
    background-position: top;
    background-size: cover;
    /*color: rgb(var(--v-theme-success));*/
  }

  .v-theme--light nav#AppBar {
    background-image: linear-gradient(
        to bottom,
        rgba(230, 230, 230, 0.95),
        rgba(250, 250, 250, 0.95)
      ),
      v-bind(headerImage);
  }

  #title {
    word-break: break-all;
    font-size: 2rem;
    font-weight: 600;
    text-decoration: none;
    color: rgb(var(--v-theme-primary));
  }
</style>
