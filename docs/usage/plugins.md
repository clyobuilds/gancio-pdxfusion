---
aside: false
---
<script setup>
import plugins from 'virtual:plugins'
</script>

# Plugins
Plugins allow you to extend Gancio features and integrate it with other services.
This page is a guide to install plugins, if you want to develop one instead look [here](/dev/plugins).
__Please note that some plugins are officially supported and distributed along with the release__
<!--
## Install

To install a plugin you have to:

1. **download the .zip archive (look for the url on the plugin list below)**
```
wget https://framagit.org/les/gancio-plugin-telegram-bridge/-/archive/v0.2.0/gancio-plugin-telegram-bridge-v0.2.0.zip
```

2. **unpack it in the `./plugins` directory.**
```
cd plugins
unzip https://framagit.org/les/gancio-plugin-telegram-bridge/-/archive/v0.2.0/gancio-plugin-telegram-bridge-v0.2.0.zip
```


3. **install the dependencies with `yarn`**
```
cd plugins/gancio-plugin-telegram-bridge
yarn
```

4. **restart gancio**
__with debian__
```
sudo sytemctl restart gancio
```
__with docker__
```
docker-compose restart
``` -->

## List of embedded plugins

<section id='plugins'>
  <v-card v-for="plugin in plugins" :key="plugin.url" :href="plugin.url" target="_blank">
    <template #text>
      <h4>{{ plugin.name }}</h4>
      <span class='text-body-small font-weight-light'>
        {{plugin.description}}
      </span>
      <div><span class='text-body-small font-weight-thin'>{{ plugin.author }}</span></div>
    </template>
  </v-card>
</section>

<style>
  #plugins {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  #plugins > .v-card {
    flex: 1 1 350px;
  }

  #plugins > .v-card h4 {
    margin: 0 0 10px 0;
    padding: 0;
  }
</style>
