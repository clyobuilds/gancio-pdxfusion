import { useLogger } from '../lib/logger'
import { publicSettings } from '~~/server/services/settings'
import { type APUser, Event } from '~~/server/services/db'
import type { APActivityBase, APActivityUndo } from './types'
import type { ActivityHandlerResult } from './handlers'

const log = useLogger('federation:ego')

// module.exports = {
//   async boost (APMessage, actor) {
//     const match = APMessage?.match(`${config.baseurl}/federation/m/(.*)`)
//     if (!match || match.length < 2) {
//       log.debug('[FEDI] Boosted something not local: %s', APMessage)
//       throw new NotFoundError('Event not found')
//     }
//     log.info(`[FEDI] boost ${match[1]}`)
//     const event = await Event.findByPk(Number(match[1]))
//     if (!event) {
//       log.debug('[FEDI] Boosted event not found: %s', APMessage)
//       throw new NotFoundError('Event not found')
//     }

//     return event.update({ boost: [...event.boost, actor] })
//   },

//   async unboost (req, res) {
//     const APMessage = req.body?.object
//     const ap_id = APMessage?.object?.object ?? APMessage?.object
//     log.info(`[FEDI] Unboost ${ap_id}`)
//     const match = ap_id?.match(`${config.baseurl}/federation/m/(.*)`)
//     if (!match || match.length < 2) {
//       // unboost remote event
//       const event = await Event.findOne({ where: { ap_id } })
//       if (!event) { return res.status(404).send('Event not found!') }
//       await event.destroy()
//     } else {
//       const event = await Event.findByPk(Number(match[1]))
//       if (!event) { return res.status(404).send('Event not found!') }
//       await event.update({ boost: event.boost.filter(actor => actor !== req.body.actor) })
//     }
//   },

/**
 { id: 'https://mastodon.cisti.org/users/testme#likes/462437',
   type: 'Like',
   object: 'https://test.cisti.org/federation/m/10',
   actor: 'https://mastodon.cisti.org/users/testme'
 }
 */
export async function handleLike(activity: APActivityBase, actor: APUser): Promise<ActivityHandlerResult> {
  const obj = activity.object
  if (!obj || typeof obj != 'string') {
    return { status: 'ignored', reason: 'Like activity with invalid object' }
  }

  // activity's actor should be the same as the actor
  if (activity.actor !== actor.ap_id) {
    return { status: 'ignored', reason: `Like activity actor mismatch: ${activity.actor} !== ${actor.ap_id}` }
  }

  let event
  const match = obj.match(`^${publicSettings.baseurl}/federation/m/(.*)`)
  if (match && match.length > 1) {
    event = await Event.findByPk(Number(match[1]))
  }

  // if (!event) {
  // in reply to another resource...
  // const resource = await Resource.findOne({ where: { activitypub_id: obj }, include: [Event] })
  // }

  if (!event) {
    // in reply to a remote event
    event = await Event.findOne({ where: { ap_id: obj } })
  }

  if (!event) {
    return { status: 'ignored', reason: 'Like to unknown event' }
  }

  // check if already liked
  if (event.likes?.includes(actor.ap_id)) {
    log.debug(`${actor.ap_id} already liked ${event.title}`)
    return { status: 'ignored', reason: 'Already liked' }
  }

  log.info(`${actor.ap_id} like ${event.title} (${event.likes?.length})`)
  await event.update({ likes: [...event?.likes ?? [], actor.ap_id] })
  return { status: 'accepted' }
}

export async function handleUnlike(activity: APActivityUndo, actor: APUser): Promise<ActivityHandlerResult> {
  const obj = activity.object.object
  if (!obj) {
    return { status: 'ignored', reason: 'Invalid unlike activity' }
  }

  let event

  const match = obj.match(`^${publicSettings.baseurl}/federation/m/(.*)`)
  if (match && match.length > 1) {
    event = await Event.findByPk(Number(match[1]))
  }

  // if (!event) {
  // in reply to another resource...
  // const resource = await Resource.findOne({ where: { activitypub_id: obj }, include: [Event] })
  // }

  if (!event) {
    // in reply to a remote event
    event = await Event.findOne({ where: { ap_id: obj } })
  }

  if (!event) {
    return { status: 'ignored', reason: 'Unlike to unknown event' }
  }

  log.info(`${actor.ap_id} unlike ${event.title} (${event.likes.length})`)
  await event.update({ likes: event.likes.filter(id => id !== actor.ap_id) })
  return { status: 'accepted' }
}