---
aside: false
---
<script setup>
  import { ref, computed } from 'vue'
  import instances from './instances.json'
  const search = ref('')
  const filteredInstances = computed(() => {
    if(search.value === '') return instances
    const s = search.value.toLowerCase()
    return instances.filter(instance => instance?.name?.toLowerCase().includes(s) || instance?.summary?.toLowerCase().includes(s) || instance?.place?.toLowerCase().includes(s))
  })
</script>
# Instances
<v-text-field v-model="search" placeholder="Search..." />
<section id="instances">
  <v-card v-for="instance in filteredInstances" :key="instance.url"
    :href="instance.url" target="_blank">
      <template #text>
        <h4><v-avatar tile size="small" :image="instance.logo" /> {{ instance.name }}</h4>
        <span class='text-body-small font-weight-light'>
          {{instance.summary}}
        </span>
        <div>{{ instance.place }} <span class='text-body-small font-weight-thin' v-if="instance.handler">{{ instance.handler }}</span></div>
      </template>
  </v-card>
</section>


You can also check federated instances on [fedilist.com](https://fedilist.com/instance?q=&ip=&software=gancio&registrations=&onion=), [fedidb.org](https://fedidb.org/software/gancio), [fediverse.observer](https://gancio.fediverse.observer/list)


<small>Do you want your instance to appear here or to be removed? [Write us](./contact).</small>

<style>
  #instances {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  #instances > .v-card {
    flex: 1 1 350px;
  }

  #instances > .v-card h4 {
    margin: 0 0 10px 0;
    padding: 0;
  }
</style>
