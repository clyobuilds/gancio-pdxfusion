<svelte:options customElement="gancio-events" />

 <script>
  import { onMount, tick } from 'svelte'
  import { when, toBoolean } from './helpers.js'
  export let baseurl = ''
  export let title = ''
  export let maxlength
  export let collection = ''
  export let tags = ''
  export let places = ''
  export let theme = 'light'
  export let show_recurrent = 'false'
  export let sidebar = 'true'
  export let show_more = 'false'
  export let max_height = ''
  export let external_style = ''

  let mounted = false
  let loading = false
  let page = 0
  let hasMore = toBoolean(show_more)
  let events = []
  let eventsEl

  async function loadEvents() {
    if (!mounted || loading) return
    loading = true

    const url = new URL('/api/events', baseurl)

    if (page > 0) {
      url.searchParams.set('page', String(page))
    }

    if (maxlength) {
      url.searchParams.set('max', String(maxlength))
    }

    if (collection) {
      url.pathname = `/feed/json/collection/${collection}`
    } else {
      if (tags) {
        url.searchParams.set('tags', tags)
      }

      if (places) {
        url.searchParams.set('places', places)
      }
    }

    url.searchParams.set('show_recurrent', String(toBoolean(show_recurrent)))

    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        throw Error(`Request failed with ${resp.status}`)
      }
      const json = await resp.json()
      const fetched = json.events || json
      if (!maxlength || fetched.length < Number(maxlength)) {
        hasMore = false
      }
      if (page === 0) {
        events = fetched
      } else {
        events = events.concat(fetched)
      }
      page++
      if (max_height && eventsEl) {
        await tick()
        if (eventsEl?.scrollHeight) {
          eventsEl.scrollTop = eventsEl.scrollHeight
        }
      }
    } catch (e) {
      console.error('Error loading Gancio API -> ', e)
    }
    loading = false
  }
  function update(v) {
    if (!mounted) return
    page = 0
    loadEvents()
  }

  function position(event) {
    if (event.media && event.media[0].focalpoint) {
      const focalpoint = event.media[0].focalpoint
      return `${(focalpoint[0] + 1) * 50}% ${(focalpoint[1] + 1) * 50}%`
    }
    return 'center center'
  }

  onMount(() => {
    mounted = true
    update()
  })

  $: if (baseurl || collection || tags || places || maxlength || show_recurrent) {
    update()
  }

  $: if (show_more) {
    hasMore = toBoolean(show_more)
  }

</script>

{#if external_style}<link rel="stylesheet" href={external_style} />{/if}
  <div
    id="gancioEvents"
    class:dark={theme === 'dark'}
    class:light={theme === 'light'}
    class:sidebar={sidebar === 'true'}
    class:nosidebar={sidebar !== 'true'}
  >
    {#if title && sidebar === 'true'}
      <a href={baseurl} target="_blank" id="header">
        <div class="content">
          <div class="title">{title}</div>
          <img id="logo" alt="logo" src="{baseurl}/logo.png" />
        </div>
      </a>
    {/if}
    <main id='events' bind:this={eventsEl} style={max_height ? `max-height: ${max_height};` : ''}>
    {#each events as event (event.id)}
      <a
        href="{baseurl}/event/{event.slug || event.id}"
        class="event"
        title={event.title}
        target="_blank"
      >
        {#if sidebar !== 'true'}
          <div class="img">
            {#if event.media?.length}
              <img
                style="object-position: {position(event)}; aspect-ratio=1.7778;"
                alt={event.media[0].name}
                src={baseurl + '/media/thumb/' + event.media[0].url}
                loading="lazy"
              />
            {:else}
              <img
                style="aspect-ratio=1.7778;"
                alt={event.title}
                src={baseurl + '/fallbackimage.png'}
                loading="lazy"
              />
            {/if}
          </div>
        {/if}
        <div class="content">
          <div class="subtitle">
            {when(event)}
          </div>
          <div class="title">
            {event.title}
          </div>
          <span class="place"
            >@{event.place.name}
            {#if event.place.name!=="online"}<span class="subtitle"> {event.place.address}</span>{/if}</span
          >
          {#if event.tags?.length}
            <div class="tags">
              {#each event.tags as tag}
                <span class="tag">#{tag}</span>
              {/each}
            </div>
          {/if}
        </div>
      </a>
    {/each}
    </main>
    {#if hasMore}
      <button title="More" id="footer" on:click={loadEvents} disabled={loading}>
        <div class="content">
          <svg class="icon"
               viewBox="0 0 32 32"
               xmlns="http://www.w3.org/2000/svg"
               style="fill-opacity:0;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;">
            <path d="M 2,16 16,28 30,16"/>
            <path d="M 2,4 16,16 30,4"/>
          </svg>
        </div>
      </button>
    {/if}
  </div>

<style>
  #gancioEvents {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
      'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
      'Noto Color Emoji';
    overflow-x: hidden;
    width: 100%;
    box-sizing: content-box;
    margin: 0 auto;
    font-size: 1rem;
    text-align: left;
  }

  .nosidebar {
    max-width: 1200px;
  }

  #events { 
    overflow-y: auto;
    scroll-behavior: smooth;
  }
  
  #header {
    padding: 1.2rem 1rem;
    background-color: var(--bg-odd-color);
  }

  .sidebar {
    max-width: 500px;
    box-shadow: rgba(60, 64, 67, 0.4) 0px 1px 2px 0px,
      rgba(60, 64, 67, 0.25) 0px 1px 3px 1px;
    border-radius: 5px;
    font-size: 1rem;
  }

  .event .img {
    width: 100%;
    max-width: 450px;
    max-height: 250px;
    aspect-ratio: 1.7778;
    flex: 1 0 auto;
    /* height: 100%; */
  }

  @media screen and (max-width: 800px) {
    .event {
      flex-wrap: wrap;
    }
    .event .img {
      max-width: 100%;
    }
  }
  .event img {
    object-fit: cover;
    border-radius: 15px;
    width: 100%;
    height: 100%;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 6px 12px -2px,
      rgba(0, 0, 0, 0.3) 0px 3px 7px -3px;
  }

  .nosidebar .event {
    margin-bottom: 2rem;
  }

  .nosidebar .content {
    margin-left: 1rem;
    margin-top: 5px;
    text-align: left;
  }

  .tags {
    margin-top: 2px;
  }

  #logo {
    position: absolute;
    top: 10px;
    right: 10px;
    height: 40px;
  }

  a {
    text-decoration: none;
    color: var(--text-color);
    display: flex;
    padding: 8px 20px;
    margin: 0;
    line-height: 1.275rem;
    font-weight: 400;
    font-size: 0.875rem;
    position: relative;
    transition: background-color 0.3s cubic-bezier(0.25, 0.8, 0.5, 1),
      padding 0.3s;
    box-sizing: content-box;
  }

  a:hover .title,
  a:focus .title,
  a:active .title {
    text-decoration: underline;
  }

  .dark {
    --bg-odd-color: #161616;
    --bg-even-color: #222;
    --bg-hover-color: #333;
    --text-color: white;
    --title-color: white;
    --line-color: rgba(120, 120, 120, 0.2);
  }

  .light {
    --bg-odd-color: #f5f5f5;
    --bg-even-color: #fafafa;
    --bg-hover-color: #eee;
    --text-color: #222;
    --title-color: black;
    --line-color: rgba(220, 220, 220, 0.9);
  }
  .sidebar a {
    background-color: var(--bg-even-color);
    border-bottom: 1px solid var(--line-color);
  }

  .sidebar a:hover,
  .sidebar a:focus,
  .sidebar a:active {
    background-color: var(--bg-hover-color);
    padding-left: 15px;
    padding-right: 25px;
  }

  .place {
    font-weight: 400;
    font-size: 1.2rem;
    line-height: 1.4rem;
    color: orangered;
  }

  .title {
    color: var(--title-color);
    font-weight: bold;
    font-size: 1.3rem;
    line-height: 1.1em;
  }

  .nosidebar .title {
    font-size: 1.9em;
    line-height: 1.1em;
  }

  .subtitle {
    font-size: 1rem;
    line-height: 1.1em;
    color: var(--title-color);
    opacity: 0.9;
  }

  .tag {
    margin-right: 10px;
    display: inline-block;
  }

  #footer {
    display: flex;
    border: none;
    width: 100%;
    padding: 1.2rem 1rem;
    background-color: var(--bg-odd-color);
    color: var(--title-color);
    font-weight: bold;
    font-size: 1.1rem;
    cursor: pointer;
  }

  #footer:hover,
  #footer:focus,
  #footer:active {
    text-decoration: underline;
    background-color: var(--bg-hover-color);
  }

  #footer .content {
    margin: auto;
  }

  .nosidebar #footer {
    border-radius: 15px;
  }
  #footer .icon {
    height: 1.1rem;
    stroke: var(--title-color);
  }
</style>
