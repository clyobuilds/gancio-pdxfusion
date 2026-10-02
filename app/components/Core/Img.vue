<script setup>

const props = defineProps({
  event: { type: Object, default: () => ({}) },
  thumb: { type: Boolean, default: false },
  lazy: { type: Boolean, default: false },
  showPreview: { type: Boolean, default: true }
})

const media = props.event.media?.[0]

const thumbnailPosition = media?.focalpoint ?
  `${(media?.focalpoint[0] + 1) * 50}% ${(media?.focalpoint[1] + 1) * 50}%`
  : 'center center'

// const backgroundPreview = media?.preview && {
//   backgroundPosition: thumbnailPosition,
//   backgroundImage: "url('data:image/png;base64," + media.preview + "')" }

const srcset = props.thumb ? '' : `/media/thumb/${media?.url} 500w, /media/${media?.url} 1200w`

const height = media?.height ?? 'auto'
const width = media?.width ?? 'auto'

const src = media?.url ? '/media/thumb/' + media?.url : (props.thumb && '/fallbackimage.png')
</script>
<template>
<div :class='{ img: true, thumb }'>
  <img
    v-if='media'
    :class='{ "u-featured": true }'
    :alt='media.name' :loading='lazy?"lazy":"eager"'
    :src="src"
    :srcset="srcset"
    itemprop="image"
    :height="height" :width="width"
    :style="{ 'object-position': thumbnailPosition }">

  <img v-else-if='!media' class='thumb' :src="`/fallbackimage.png`" alt=''>
</div>
</template>

  <style>

  .img {
    width: 100%;
    height: auto;
    position: relative;
    overflow: hidden;
    display: flex;
    background-size: contain;
  }

  .img img {
    object-fit: contain;
    max-height: 125vh;
    display: flex;
    width: 100%;
    max-width: 100%;
    height: auto;
    overflow: hidden;
    transition: opacity .5s;
    opacity: 1;
    background-size: 100%;
  }

  .img.thumb img {
    display: flex;
    max-height: 250px;
    min-height: 160px;
    object-fit: cover;
    object-position: top;
    aspect-ratio: 1.7778;
  }

  </style>
