import { getHeader } from 'h3'
import Negotiator from 'negotiator'
import type { H3Event } from 'h3'

export type SupportedMediaType =
  | 'text/html'
  | 'application/json'
  | 'application/activity+json'
  | 'application/ld+json'
  | 'application/rss+xml'
  | 'text/calendar'

export function negotiate(event: H3Event) {
  // TODO: use negotiator to redirect in case accept different mime type!

  const supported: SupportedMediaType[] = ['text/html', 'application/rss+xml', 'text/calendar',
    'application/json', 'application/activity+json', 'application/ld+json']

  const negotiator = new Negotiator({
    headers: {
      accept: getHeader(event, 'accept') || ''
    }
  })
  return negotiator.mediaType(supported) as SupportedMediaType | undefined
}

export function preferHTML(event: H3Event): boolean {
  return negotiate(event) === 'text/html'
}

export function preferJSON(event: H3Event): boolean {
  return negotiate(event) === 'application/json'
}

export function preferLDJSON(event: H3Event): boolean {
  return ['application/ld+json', 'application/activity+json'].includes(negotiate(event) || '')
}

export function preferRSS(event: H3Event): boolean {
  return negotiate(event) === 'application/rss+xml'
}

export function preferCalendar(event: H3Event): boolean {
  return negotiate(event) === 'text/calendar'
}
