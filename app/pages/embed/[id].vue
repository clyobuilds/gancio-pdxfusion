<script setup>
definePageMeta({
  layout: 'iframe'
})

const { params } = useRoute()
const { when } = useTime()
const { data: event } = await useFetch(`/api/event/detail/${params.id}`)
if (!event.value) {
  throw createError({ statusCode: 404, message: 'Event not found' })
}

// <iframe src='http://localhost:13120/embed/1' class='embedded_gancio'></iframe>
</script>
<template>
<nuxt-link class="embed_event" :to='`/event/${event.slug || event.id}`' target='_blank' >

  <img class="float-left" :src='mediaURL(event, "thumb")'>
  <div class="event-info">
    <div class="date">{{when(event)}}</div><br>
    <h4>{{event.title}}</h4>

    <div class="date">{{event.place.name}}</div>
  </div>
</nuxt-link>
</template>

<style>
.embed_event {
  display: flex;
  transition: margin .1s;
  background: url('/logo.png') no-repeat right 5px bottom 5px;
  background-size: 32px;
  background-color: #1f1f1f;
  text-decoration: none;
  border: 1px solid #b1a3a3;
  margin: 0px auto;
  padding: 0px;
  width: 400px;
  height: 210px;
  overflow: hidden;
  border-radius: 10px;
  margin: 0px;

  &:hover {
    transform: prospective(10) translateX(10);
    margin-left: 5px;
    text-decoration: none;
  }

  .event-info {
    height: 100%;
    color: #eee !important;
    flex-direction: column;
    padding: 5px;

    .date {
      color: #999;
    }
  }

  img {
    width: 150px;
    object-fit: cover;
    object-position: top;
    margin-right: 5px;
    height: 100%;
  }

}
</style>
