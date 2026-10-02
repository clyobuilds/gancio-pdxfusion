import { get as getConfig } from './services/config'
import sharp from 'sharp'
import path from 'path'
import crypto from 'crypto'
import { Readable } from 'node:stream'
import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'
import { useLogger } from './lib/logger'
import { type H3Event, createError, setHeader, sendStream } from 'h3'
import mime from 'mime-types'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { handleCache } from './lib/API'
import type { Media } from './services'

const window = new JSDOM('').window
const domPurify = DOMPurify(window)
const log = useLogger('helper')
const config = getConfig()

domPurify.addHook('beforeSanitizeElements', (node) => {
  if (node.hasAttribute && node.hasAttribute('href')) {
    const href = node.getAttribute('href')
    const text = node.textContent

    // remove FB tracking param
    if (href.includes('fbclid=')) {
      try {
        const url = new URL(href)
        url.searchParams.delete('fbclid')
        node.setAttribute('href', url.href)
        if (text.includes('fbclid=')) {
          node.textContent = url.href
        }
      } catch {
        return node
      }
    }
  }
  return node
})

export function sanitizeHTML(html: string) {
  return domPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'br', 'i', 'span', 'em',
      'h6', 'b', 'a', 'li', 'ul', 'ol', 'code', 'blockquote', 'u', 's', 'strong'],
    ALLOWED_ATTR: ['href', 'target']
  })
}

// preferHTML (req) {
//   return req.accepts('html', 'application/activity+json', 'application/ld+json') === 'html'
// },

async function readableWebToNodeStream(webStream) {
  const reader = webStream.getReader()
  return new Readable({
    async read() {
      const { done, value } = await reader.read()
      this.push(done ? null : value)
    }
  })
}

export async function getImageFromURL(url: string, name: string, focalpoint?: [number, number]): Promise<Media> {
  log.debug(`getImageFromURL ${url}`)

  const filename = crypto.randomBytes(16).toString('hex')
  const sharpStream = sharp({ failOn: 'error' })
  const promises = [
    sharpStream.clone().rotate().resize(500, null, { withoutEnlargement: true }).jpeg({ mozjpeg: true })
      .toFile(path.resolve(config.upload_path, 'thumb', filename + '.jpg')),
    sharpStream.clone().rotate().resize(1200, null, { withoutEnlargement: true })
      .jpeg({ quality: 95, mozjpeg: true }).toFile(path.resolve(config.upload_path, filename + '.jpg'))
  ]

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  const srcStream = await readableWebToNodeStream(response.body)
  srcStream.pipe(sharpStream)
  return Promise.all(promises)
    .then((res) => {
      const info = res[1]
      return {
        name,
        url: filename + '.jpg',
        ...(info?.height && ({ height: info.height })),
        ...(info?.width && ({ width: info.width })),
        ...(info?.size && ({ size: info.size })),
        focalpoint
      }
    })
    .catch((err) => {
      log.error(err)
      throw err
    })
}

export function isHiddenService(domain: string) {
  const pattern = /^(http:\/\/)?[a-zA-Z0-9]+\.(onion|i2p)\/?$/
  return pattern.test(domain)
}

/**
 * Serves a static file
 * Sets appropriate Content-Type and cache headers based on the file.
 * Streams the file content to the client.
 *
 * @param event - The H3Event representing the incoming request.
 * @param path - The file system path to the file to be served.
 */
export async function serveFile(event: H3Event, path: string) {
  const s = await stat(path).then(s => s.isFile() ? s : null).catch(() => null)
  if (!s) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const mimeType = mime.lookup(path) || 'application/octet-stream'
  setHeader(event, 'Content-Type', mimeType)

  if (await handleCache(event, s)) return
  return sendStream(event, createReadStream(path))
}

/**
 * Import events from url
 * It does supports ICS and H-EVENT
 */
// async importURL(req, res) {
//   const url = req.query.URL
//   try {
//     const response = await axios.get(url, { headers: { Accept: 'text/html, text/calendar'}})
//     const contentType = response.headers['content-type']

//     if (contentType.includes('text/html')) {
//       Microformats.get({ html: response.data, filter: ['h-event'] }, (err, data) => {
//         if (err || !data.items.length || !data.items[0].properties) {
//           return res.sendStatus(404)
//         }
//         const events = data.items.map(e => {
//           const props = e.properties
//           let media = get(props, 'featured[0]')
//           if (media) {
//             media = URL.resolve(url, media)
//           }
//           return {
//             title: get(props, 'name[0]', ''),
//             description: get(props, 'description[0]', ''),
//             place: {
//               name: get(props, 'location[0].properties.name[0].value', '') || get(props, 'location[0].properties.name', '') || get(props, 'location[0]'),
//               address: get(props, 'location[0].properties.street-address[0]') || get(props, 'location[0].properties.street-address')
//             },
//             start_datetime: dayjs(get(props, 'start[0]', '')).unix(),
//             end_datetime: dayjs(get(props, 'end[0]', '')).unix(),
//             tags: get(props, 'category', []),
//             media: media ? [{ name: get(props, 'name[0]', ''), url: media, focalpoint: [0, 0] }] : []
//           }
//         })
//         return res.json(events)
//       })
//     } else if (contentType.includes('text/calendar')) {
//       const ret = ical.parse(response.data)
//       const component = new ical.Component(ret)
//       const events = component.getAllSubcomponents('vevent')
//       return res.json(events.map(e => {
//         const event = new ical.Event(e)
//         return {
//           title: get(event, 'summary', ''),
//           description: get(event, 'description', ''),
//           place: { name: get(event, 'location', '') },
//           start_datetime: dayjs(get(event, 'startDate', null)).unix(),
//           end_datetime: dayjs(get(event, 'endDate', null)).unix()
//         }
//       }))
//     } else {
//       log.debug('[IMPORT URL] %s -> Content type not supported %s', url, contentType)
//       return res.status(400).json('Content type not supported')
//     }
//   } catch (e) {
//     log.error('[Import URL]', e)
//     res.status(400).json(e.toString())
//   }
// },

// getWeekdayN(date, n, weekday) {
//   let cursor
//   if (n === -1) {
//     cursor = date.endOf('month')
//     cursor = cursor.set({ weekday })
//     if (cursor.month !== date.month) {
//       cursor = cursor.minus({ days: 7 })
//     }
//   } else {
//     cursor = date.startOf('month')
//     // cursor = cursor.add(cursor.day <= date.day ? n - 1 : n, 'week')
//     cursor = cursor.plus({ weeks: cursor.weekday <= weekday ? n-1 : n })
//     cursor = cursor.set({ weekday })
//   }
//   cursor = cursor.set({ hour: date.hour, minute: date.minute, second: 0 })
//   log.debug(cursor)
//   return cursor
// },

// async APEventRedirect(req, res, next) {
//   const eventController = require('../server/api/controller/event')

//   if (Helpers.preferJSON(req)) {
//     const event = await eventController._get(req.params.slug)
//     if (event) {
//       log.debug('[FEDI] APRedirect for %s', event.title)
//       return res.redirect(301, event?.ap_id ?? `/federation/m/${event.id}`)
//     }
//     log.warn('[FEDI] Accept JSON but event not found: %s', req.params.slug)
//     return res.redirect(`/federation/u/${settingsController.settings.instance_name}`, 302)
//   }
//   next()
// },

// async APRedirect (req, res, next) {
//   if (Helpers.preferJSON(req)) {
//     log.debug(`[FEDI] JSON preferred ${req.path}`)
//     return res.redirect(301, `/federation/u/${settingsController.settings.instance_name}`)
//   }
//   next()
// },

// async feedRedirect(req, res, next) {
//   const accepted = req.accepts('html', 'application/rss+xml', 'text/calendar')
//   if (['application/rss+xml', 'text/calendar'].includes(accepted) && (/^\/(tag|place|collection)\/.*/.test(req.path) || req.path === '/')) {
//     return res.redirect((accepted === 'application/rss+xml' ? '/feed/rss' : '/feed/ics') + req.path)
//   }
//   next()
// },
