---
title: News
aside: false
sidebar: false
next: false
prev: false
editLink: false
lastUpdated: false
---
<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as posts } from '/data/posts.data'

function formatDate(date: string) {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(date).toLocaleDateString(undefined, options)
}
</script>

<div class='blog-list'>
  <article v-for='post in posts' :key='post.frontmatter.url'>
    <a :href="withBase(post.url)">{{post.frontmatter.title}}</a>
    <p class="meta">{{ formatDate(post.frontmatter.date) }} </p>
  </article>
</div>

<style scoped>
.blog-list article { margin-bottom: 2rem; }
.blog-list article a { font-size: 2rem; font-weight: 200; }
.meta { color: var(--vp-c-text-2); font-size: .875rem; margin: 0px; }
</style>
