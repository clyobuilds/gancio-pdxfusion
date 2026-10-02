import linkifyHtml from 'linkify-html'
import { sanitizeHTML } from '../helpers'
import { useLogger } from '../lib/logger'
import { Event, Resource, type APUser } from '../services/db'
import type { APActivityBase, APNote } from './types'
import { _signAndSend, signAndSend } from './sign_and_send'
import { publicSettings } from '../services/settings'
import { applicationActorId, hasPublicTarget } from './helpers'
import type { ActivityHandlerResult } from './handlers'

const log = useLogger('federation:notes')

/**
 * Gancio could receive a `Note` from a remote actor to comment on an event
 * I know this could sounds a little confusing but this is internally called `Resource` to explicitly
 * indicate that this is not a comment but could be another media (image, video, audio, etc.)
 */
export async function handleCreateNote(message: APNote, targets: string[], actor: APUser): Promise<ActivityHandlerResult> {
  if (!publicSettings.enable_resources) {
    return { status: 'ignored', reason: 'Resources are disabled in settings' }
  }

  // search for related event
  let event
  // it's a reply or a quote
  const inReplyTo = message?.inReplyTo ?? message?.quote ?? message?.quoteUri ?? message?._misskey_quote
  if (inReplyTo) {
    // .. to an event ?
    const match = inReplyTo && inReplyTo.match(`^${publicSettings.baseurl}/federation/m/(.*)`)
    log.info(`Event reply => ${inReplyTo}`)
    if (match && match.length > 1) {
      event = await Event.findByPk(Number(match[1]))
    } else {
      // in reply to another resource...
      const resource = await Resource.findOne({ where: { activitypub_id: inReplyTo }, include: [Event] })
      event = resource && resource.event
    }

    if (!event) {
      // in reply to a remote event
      event = await Event.findOne({ where: { ap_id: inReplyTo } })
    }
  }

  if (!event) {
    return { status: 'ignored', reason: 'Create Activity for Note object are only supported for events or other local notes' }
  }

  log.debug(`Reply from ${actor.ap_id} to "${publicSettings.baseurl}/event/${event.slug}"`)

  message.content = sanitizeHTML(linkifyHtml(message.content || '', { target: '_blank', render: { email: ctx => ctx.content } }))

  await Resource.create({
    activitypub_id: message.id,
    apUserApId: actor.ap_id,
    data: message,
    eventId: event && event.id,
    hidden: !hasPublicTarget(targets)
  })
  return { status: 'accepted' }
}

// https://fediverse.codeberg.page/fep/fep/044f/
// https://shkspr.mobi/blog/2025/10/getting-started-with-mastodons-quote-posts-technical-implementation-details-for-servers
export async function handleQuoteRequest(message: APActivityBase, actor: APUser): Promise<ActivityHandlerResult> {
  // APActivityQuoteRequest
  const quoter_post_id = typeof message.instrument === 'string' ? message.instrument : message?.instrument?.id
  log.debug(`Quote request from ${actor.ap_id} to ${quoter_post_id}`)

  // calculate base64 from quoter_post_id, message.id
  const stamp = Buffer
    .from(JSON.stringify({
      eventId: message.object,
      quoterPostId: quoter_post_id
    }))
    .toString('base64url')

  log.debug(`Stamp: ${stamp}`)
  // send Accept
  const accept = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      { QuoteRequest: 'https://w3id.org/fep/044f#QuoteRequest' }
    ],
    'id': `${publicSettings.baseurl}/federation/activity/${crypto.randomUUID()}`,
    'type': 'Accept' as const,
    'actor': applicationActorId,
    'object': {
      id: message.id,
      type: 'QuoteRequest' as const,
      actor: actor.ap_id,
      object: message.object,
      instrument: quoter_post_id
    },
    'result': `${publicSettings.baseurl}/federation/q/${stamp}`
  }
  log.debug(`Accept quote request: ${JSON.stringify(accept)}`)

  await signAndSend(accept, actor.object.inbox)
  return { status: 'accepted' }
}

/**
 * Update a resource from AP Note
 * the actor should be the same as the resource's author
 */
export async function handleUpdateNote(message: APNote, actor: APUser): Promise<ActivityHandlerResult> {
  if (!publicSettings.enable_resources) {
    return { status: 'ignored', reason: 'Resources are disabled in settings' }
  }

  const resource = await Resource.findOne({ where: { activitypub_id: message?.id, apUserApId: actor.ap_id } })
  if (!resource) {
    return { status: 'ignored', reason: 'Note not found' }
  }

  message.content = sanitizeHTML(linkifyHtml(message.content || '', { target: '_blank', render: { email: ctx => ctx.content } }))
  await resource.update({ data: message })
  return { status: 'accepted' }
}

export async function handleDeleteNote(message: APNote, actor: APUser) {
  const resource = await Resource.findOne({ where: { activitypub_id: message?.id, apUserApId: actor.ap_id } })
  if (!resource) {
    log.warn(`Note not found`)
    return
  }
  await resource.destroy()
  log.info(`Note ${resource.activitypub_id} removed`)
}