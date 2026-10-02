/**
 * I want to read the plugin manifest without loading the plugin
 * I want to test the plugin without loading it
 * I want to load / unload the plugin
 * I want to access context from everywhere
 */

import type { GancioContext, GancioPlugin } from '../../../server/services/plugins'

export default ({ log, db, publicSettings, services }: GancioContext): GancioPlugin => ({
  settings: {},
  manifest: {
    name: 'base',
    author: 'lesion',
    url: 'https://framagit.org/les/gancio',
    description: 'Get events from a specified ics feed, this is a beta release of this plugin: you can specify only a single feed, images are not imported from ics, event location are taken as is as are not structured in ics, read the code',
    settings: {
      refresh_minutes: {
        type: 'NUMBER',
        description: 'Refresh the feed each N minutes, if 0 refreshes only at startup',
        required: true,
        hint: '60 minutes?'
      },
      feed_URL: {
        type: 'TEXT',
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
        description: 'Add tag(s) to each imported event (comma-separated)',
        required: false
      }
    }
  },
  load(settings) {
    this.settings = settings
  },
  routeAPI(req, res, next) {

  },
  onCLI(args) {

  },
  onTest(settings?: Record<string, any>) {

  },
  _isTickRunning: false,
  async _tick(FeedURL: string, defaultTags?: string[], includePastEvents?: boolean) {
    // Avoid running multiple ticks at the same time which could cause race conditions on the database
    if (this._isTickRunning) {
      log.warn('[FEED Plugin] _tick already in progress, skipping')
      return
    }
    log.debug('[FEED Plugin] _tick started, locking it')
    this._isTickRunning = true

    try {
      if (!FeedURL) {
        log.warn('[FEED Plugin] feed URL is required!')
        // clearInterval(this._interval)
        return
      }

      // const add_tags = plugin.settings.add_tag?.split(',')
      //   .map((tag) => tag.trim())
      //   .filter((tag) => tag.length > 0)
      // let tags = []
      // if (add_tags?.length) {
      //   plugin.log.debug(`[FEED Plugin] Adding tags to imported events: ${add_tags}`)
      //   for (tagName of add_tags) {
      //     const exists = await plugin.db.models.tag.findOne({
      //       where: {
      //         tag: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('tag')), Sequelize.Op.eq, tagName.toLocaleLowerCase()),
      //       }
      //     })
      //     if (exists) {
      //       tags.push(exists)
      //       continue
      //     }
      //     tags.push(await plugin.db.models.tag.create({ tag: tagName }))
      //     plugin.log.debug(`[FEED Plugin] Created tag: ${tagName}`)
      //   }
      // }

      // try {
      log.debug(`[FEED Plugin] Fetching ${FeedURL}`)

      const icsText = await fetch(FeedURL).then(res => res.text())
      const events = services.parseIcsData(icsText, includePastEvents)
      log.info(`Found ${events.length} event(s)`)

      // for (const evt of events) {
      //   // Check if an event with the same title and start_datetime already exists
      //   // TODO: Ideally this should use the ICS UID, but database does not have it
      //   const Event = db.models?.event ?? db.models.get('Event')
      //   const exists = await Event.findOne({
      //     where: {
      //       title: evt.title,
      //       start_datetime: evt.start_datetime,
      //     }
      //   })

      //   if (exists) {
      //     log.debug(`[FEED Plugin] Event ${evt.title} already exists, do not add it`)
      //     continue
      //   }

      //   log.debug(`[FEED Plugin] Adding event: ${evt.title} `)

      //   const loc = evt.location?.trim()
      //   const pos = loc?.indexOf(',')
      //   const placeName = loc?.substring(0, pos === -1 ? undefined : pos).trim() || 'Unknown Place'
      //   const address = loc?.substring(pos === -1 ? 0 : pos + 1).trim() || placeName

      // Create a new event
      // TODO [image]: ics could not embed images (ok you can use ATTACH but it is not supported by the used library, see https://github.com/adamgibbons/ics/issues/194,
      // we could visit the original event's url and get the image from there via opengraph with some fallback
      // try {
      // TODO [place]: how we should create a place? in ics the location field is just a string, should we query nominatim?

      //   let place = await plugin.db.models.place.findOne({
      //     where: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), Sequelize.Op.eq, placeName.toLocaleLowerCase()),
      //   })
      //   if (place) {
      //     plugin.log.debug(`[FEED Plugin] Place ${place.name} already exists, do not add it`)
      //   } else {
      //     plugin.log.debug(`[FEED Plugin] Create a new place: ${placeName}`)
      //     place = await plugin.db.models.place.create({ name: placeName, address: address })
      //   }
      //   const dbEvent = await plugin.db.models.event.create(evt)
      //   await dbEvent.setPlace(place)
      //   await dbEvent.setTags(tags)
      //   log.info(`[FEED Plugin] Created event ${dbEvent.title} @ ${place.name}`)
      // } catch (e) {
      //   log.error(`[FEED Plugin] Error creating event: ${String(e)}`)
      // }
      // }
      //   } catch (e) {
      //     console.error(e)
      //     log.error(`[FEED Plugin] Error fetching ics "${settings?.feed_URL}": ${String(e)}`)
      //   }
    } catch (e) {
      console.error(e)
      //   log.error(e)
      //   log.error(`[FEED Plugin] Uncaught error in _tick: ${String(e)}`)
    } finally {
      log.debug('[FEED Plugin] _tick finished, unlocking it')
      this._isTickRunning = false
    }
  }
})
