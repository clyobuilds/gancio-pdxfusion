---
aside: false
---

# Embed events in webpages


## Embed a single event or a list of events in your webpage

You can embed a list of filtered events or a specific event card in your webpage using a classic old-school `iframe` or a shiny new webcomponent.

## Webcomponents
[Webcomponents](https://www.webcomponents.org/introduction) usage requires a small (~5kB gzipped) js script to be loaded in your page (note that you should use your instance name):
```html
<script src='https://demo.gancio.org/gancio-events.es.js'></script>
```

### Embed a single event
To embed an event in webpages you use `<gancio-event>` custom element, you can copy the required code in **event's page > Embed > Copy**, should be like the following:

```html
<gancio-event id=17 baseurl='https://demo.gancio.org'></gancio-event>
```

<!--<script src='/v2/assets/js/gancio-events.es.js'></script>-->
<gancio-event id=17 baseurl='https://demo.gancio.org'></gancio-event>  


### Embed event lists
You can also embed a list of events using `<gancio-events>` custom element, you can copy the required code in **Export > List > Copy**


```html
<gancio-events baseurl='https://gancio.cisti.org'>
  <a href='https://gancio.cisti.org'>Gancio Events</a>
</gancio-events>
```
<script setup>
  import { onMounted, ref, computed } from 'vue'
  
  onMounted(() => {
    if (!document.querySelector('#gancio-events-script')) {
      const script = document.createElement('script')
      script.id = 'gancio-events-script'
      script.src = 'https://demo.gancio.org/gancio-events.es.js'
      document.head.appendChild(script)
    }
  })

  const dark = ref(false)
  const sidebar = ref(true)
  const show_more = ref(true)
  const max = ref(4)
  const height = ref('50vh')
  const title = ref('Gancio Events')
  const instance = ref('https://gancio.cisti.org')
  const theme = computed(() => dark.value ? 'dark' : 'light')
  
</script>

<style>
  label {
    display: block;
    margin: 0px;
    padding: 10px;
  }
</style>
<div style='display: flex; gap: 10px;'>
<aside class='flex-1/3'>
  <v-switch label='Dark' v-model='dark'/>
  <v-switch label='Sidebar' v-model='sidebar'/>
  <v-switch label='Show More' v-model='show_more'/>
  <v-text-field label='Title' v-model='title'/>
  <v-text-field label='Max items' v-model='max'/>
  <v-text-field label='Max inner height' v-model='height'/>
  <v-select label='Instance' v-model='instance' :item-props="true" :items='[
    { subtitle: "https://gancio.cisti.org", title: "Gancio", value: "https://gancio.cisti.org" },
    { subtitle: "https://lapunta.org", title: "LaPunta", value: "https://lapunta.org" },
    { subtitle: "https://demo.gancio.org", title: "Demo", value: "https://demo.gancio.org" }
  ]'/>
</aside>

<gancio-events
  class='flex-1'
  :title='title'
  :sidebar='sidebar ? "true" : "false"'
  :theme='theme'
  :show_more='show_more ? "true" : "false"'
  :max_height='height'
  :maxlength='max'
  :baseurl='instance'
/>
</div>

::: info Customize
Note that you can modify the title (or completely remove it using an empty `title`),
you can limit the list to a maximum number of events using the `maxlength` parameter and filter events by `tags` or `places` using that parameters (it's easier using **gancio** than to explain it here)
:::


## IFrame
You can also use the old iframe method
<iframe src='https://demo.gancio.org/embed/17' style="width: 410px; border: none; height: 210px; overflow: hidden;"></iframe>

```html
<iframe src='https://demo.gancio.org/embed/17' style="width: 410px; border: none; height: 210px; overflow: hidden;"></iframe>
```

<!--
## Wordpress
To embed an event or a list of events into a [WordPress](https://wordpress.com) website you can use the [WPGancio](https://wordpress.org/plugins/wpgancio/) plugin, this allows you to use webcomponents and shortcodes and automatically includes the needed script in each page and post.-->