/**
 * Feed plugin for Gancio: imports events from an ICS feed
 */

import type { GancioContext, GancioPlugin } from '../../server/services/plugins'
import type { PluginSettings } from '../../shared/types/settings'
// import type { H3Event } from 'h3'

type FeedSettings = PluginSettings & {
  refresh_minutes: number
  feed_URL: string
  include_past: boolean
  add_tag?: string
}

function normalizeUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return 'https://' + url
  }
  return url
}

export default ({ log, db, services }: GancioContext): GancioPlugin => ({
  settings: {} as FeedSettings,
  manifest: {
    name: 'Feed',
    author: 'lesion',
    version: '2.0',
    url: 'https://framagit.org/les/gancio',
    description: 'Get events from a specified ICS feed: you can specify only a single feed, images are not imported from ics, event location are taken as is as are not structured in ICS',
    settings: {
      refresh_minutes: {
        type: 'NUMBER',
        description: 'Refresh rate (minutes)',
        hint: 'Refresh the feed each N minutes. Leave 0 to refresh only at startup. Recommendation: 60 minutes.',
        required: true,
        min: 0
      },
      feed_URL: {
        type: 'URL',
        description: 'ICS feed URL',
        required: true,
        hint: 'Check it before'
      },
      include_past: {
        type: 'CHECK',
        description: 'Include events in the past',
        required: true
      },
      add_tag: {
        type: 'TEXT',
        description: 'Default event tags',
        hint: 'Add tag(s) to each imported event (comma-separated)',
        required: false
      }
    }
  },
  load () {
    log.debug('Feed plugin loaded with settings:', this.settings)
    services.TaskManager.add({
      name: 'Plugin:Feed',
      repeat: true,
      repeatDelay: Number(this.settings?.refresh_minutes),
      method: async () => {
        try {
          await this._tick(normalizeUrl(this.settings?.feed_URL), this.settings?.add_tag, this.settings?.include_past)
        } catch (e) {
          log.error(`[FEED Plugin] Error in scheduled refresh: ${String(e)}`)
        }
      }
    })
  },
  unload() {
    log.debug('Feed plugin unloaded')
    services.TaskManager.remove('Plugin:Feed')
  },
  routeAPI() {
    log.debug('routeAPI called')
    return { success: true }
  },
  async onCLI(args) {
    log.debug('onCLI called with args:', args)
    if (args[0] === 'refresh') {
      const ret = await this._tick(this.settings?.feed_URL, [], this.settings?.include_past)
      console.log('Feed refreshed', ret)
    }
    if (args[0] === 'listSources') {
      console.log([{ feed_URL: this.settings?.feed_URL, include_past: this.settings?.include_past }])
    }
  },
  onTest(settings: FeedSettings) {
    if (!settings.feed_URL) {
      throw Error('feed_URL is required')
    }
    const ret = this._tick(normalizeUrl(settings.feed_URL), settings.add_tag, false)
    return ret
  },
  _isTickRunning: false,
  etag: null,
  lastModified: null,
  async _tick(feed_URL: string, defaultTags?: string, includePastEvents?: boolean) {
    // Avoid running multiple ticks at the same time which could cause race conditions on the database
    if (this._isTickRunning) {
      log.warn('[FEED Plugin] _tick already in progress, skipping')
      throw Error('[Feed Plugin] Already working')
    }

    if (!feed_URL) {
      log.warn('[FEED Plugin] feed URL is required!')
      throw Error('[Feed Plugin] feed URL is required')
    }

    try {
      log.debug('[FEED Plugin] _tick started, locking it')
      this._isTickRunning = true
      const add_tags = defaultTags?.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
      let tags
      if (add_tags?.length) {
        log.debug(`[FEED Plugin] Adding tags to imported events: ${add_tags}`)
        tags = await services.findOrCreateTags(add_tags)
      }

      const headers: Record<string, string> = {
        Accept: 'text/calendar',
        ...(this.lastModified && { 'If-Modified-Since': this.lastModified }),
        ...(this.etag && { 'If-None-Match': this.etag })
      }

      log.debug(`[FEED Plugin] Fetching ${feed_URL} with headers: ${JSON.stringify(headers)}`)
      const ret = await fetch(feed_URL, { headers })
      if (ret.status === 304) {
        log.debug('[FEED Plugin] Feed not modified, skipping')
        return
      }
      if (!ret.ok) {
        log.error(`[FEED Plugin] Failed to fetch feed: ${ret.status} ${ret.statusText}`)
        throw Error(`Failed to fetch feed: ${ret.status} ${ret.statusText}`)
      }

      this.etag = ret.headers.get('ETag')
      this.lastModified = ret.headers.get('Last-Modified')
      log.debug(`[FEED Plugin] Updated feed metadata: ETag=${this.etag}, Last-Modified=${this.lastModified}`)

      const icsText = await ret.text()
      const events = services.parseIcsData(icsText, includePastEvents)
      log.info(`Found ${events.length} event(s)`)

      for (const evt of events) {
        if (!evt) continue
        // Check if an event with the same title and start_datetime already exists
        // TODO: Ideally this should use the ICS UID, but database does not have it
        const exists = await db.Event.findOne({
          where: {
            title: evt?.title,
            start_datetime: evt?.start_datetime
          }
        })

        if (exists) {
          log.debug(`[FEED Plugin] Event ${evt.title} already exists, do not add it`)
          continue
        }

        log.debug(`[FEED Plugin] Adding event: ${evt.title} `)

        const loc = evt.location?.trim()
        const pos = loc?.indexOf(',')
        const placeName = loc?.substring(0, pos === -1 ? undefined : pos).trim() || 'Unknown Place'
        const address = loc?.substring(pos === -1 ? 0 : pos + 1).trim() || placeName

        // Create a new event
        // TODO [image]: ics could not embed images (ok you can use ATTACH but it is not supported by the used library, see https://github.com/adamgibbons/ics/issues/194,
        // we could visit the original event's url and get the image from there via opengraph with some fallback
        try {
          // TODO [place]: how we should create a place? in ics the location field is just a string, should we query nominatim?
          let place = await db.Place.findOne({ where: { name: placeName } })
          if (place) {
            log.debug(`[FEED Plugin] Place ${place.name} already exists, do not add it`)
          } else {
            log.debug(`[FEED Plugin] Create a new place: ${placeName}`)
            place = await db.Place.create({ name: placeName, address: address })
          }
          const dbEvent = await db.Event.create(evt)
          await dbEvent.setPlace(place)
          await dbEvent.setTags(tags)
          log.info(`[FEED Plugin] Created event ${dbEvent.title} @ ${place.name}`)
        } catch (e) {
          log.error(`[FEED Plugin] Error creating event: ${String(e)}`)
        }
      }
    } catch (e) {
      log.error(e)
      throw e
      //   log.error(e)
      //   log.error(`[FEED Plugin] Uncaught error in _tick: ${String(e)}`)
    } finally {
      log.debug('[FEED Plugin] _tick finished, unlocking it')
      this._isTickRunning = false
    }
  }
})
