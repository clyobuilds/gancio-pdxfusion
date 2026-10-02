import { handleFollow, handleUnfollow } from './follows'

import { useLogger } from '../lib/logger'
import { handleCreateEvent, handleUpdateEvent } from './events'

import { type APKey, APUser, Event, Resource } from '../services/db'
import { handleCreateNote, handleQuoteRequest, handleUpdateNote } from './resources'
import { handleLike, handleUnlike } from './ego'
import { _signAndSend } from './sign_and_send'

import { getActor } from './get_actor'
import { type APActivityUndo, APActivityUndoSchema, type APActivityBase, APActivityBaseSchema, APNoteSchema, APEventSchema } from './types'
import { dereferenceActivityObject, sameOrigin, targetsForActivity } from './helpers'

const log = useLogger('APHandlers')

export type ActivityHandlerResult = { status: 'accepted' }
  | { status: 'ignored', reason: string }
  | { status: 'unsupported', reason: string }

/**
 * Handles an incoming AP activity
 */
export async function handleActivity(
  activity: APActivityBase,
  verify?: { actor: APUser, key?: APKey },
  proofVerify?: { actor: APUser, key: APKey }
): Promise<ActivityHandlerResult> {
  const actor = proofVerify?.actor || verify?.actor
  const key = proofVerify?.key || verify?.key

  if (!actor || !key) {
    return { status: 'ignored', reason: 'No verifiable actor' }
  }

  if (actor?.blocked || actor.instance?.blocked) {
    return { status: 'ignored', reason: `Activity from blocked actor ${actor.ap_id} | ${actor.instance?.domain}` }
  }

  // for this activities, the `activity.actor` property has to be the same that signed the activity
  const sameActorActivities = ['Follow', 'Like', 'Announce', 'Create', 'Update', 'Delete']
  if (sameActorActivities.includes(activity.type) && activity.actor !== actor.ap_id) {
    return { status: 'ignored', reason: `Activity type ${activity.type} actor mismatch: ${activity.actor} !== ${actor.ap_id}` }
  }

  log.debug(`Handling activity ${activity.type} from ${actor.ap_id}`)
  switch (activity.type) {
    case 'Follow':
      // someone is following us
      return handleFollow(activity, actor)
    case 'Accept':
      return { status: 'accepted' }
    case 'Like':
      // someone liked one of our events
      return handleLike(activity, actor)
    case 'Create':
      return handleCreate(activity, actor)
    case 'Update':
      return handleUpdate(activity, actor)
    case 'Announce':
      // someone boosted one of our events
      return handleAnnounce(activity, { actor, key })
    case 'Delete':
      return handleDelete(activity, actor)
    case 'Undo':
      return handleUndo(activity, actor)
    case 'QuoteRequest':
      return handleQuoteRequest(activity, actor)
  }
  return { status: 'unsupported', reason: `Activity type ${activity.type} not supported` }
}

async function handleUndo(activity: APActivityBase, actor: APUser): Promise<ActivityHandlerResult> {
  const { success, data: undoActivity, error } = APActivityUndoSchema.safeParse(activity)
  if (!success || !undoActivity) {
    log.warn(`Invalid Undo activity: ${JSON.stringify(activity)} - ${error.message}`)
    return { status: 'ignored', reason: `Invalid Undo activity: ${error.message}` }
  }

  switch (undoActivity.object.type) {
    case 'Follow':
      return handleUnfollow(undoActivity, actor)
    case 'Announce':
      return handleUnannounce(undoActivity, actor)
    case 'Like':
      return handleUnlike(undoActivity, actor)
  }
}

/**
 * incoming Announce activity (e.g. Event from trusted source)
 * note: Announce is a boost from mastodon
 */
async function handleAnnounce(activity: APActivityBase, verify?: { actor: APUser, key: APKey }): Promise<ActivityHandlerResult> {
  log.info(`Announce activity from ${verify?.actor.ap_id}: ${activity.id}`)
  const obj = await dereferenceActivityObject(activity.object)
  if (!obj || typeof obj !== 'object' || !('type' in obj)) {
    return { status: 'ignored', reason: 'Remote object not found: ' + String(activity.object) }
  }

  const { success, data: announcedActivity, error } = APActivityBaseSchema.safeParse(obj)
  if (!success) {
    return { status: 'ignored', reason: 'Nope: ' + String(error) }
  }

  console.error(announcedActivity)
  // an incoming Announce could be just the id of the remote object
  if (obj.type === 'Create') {
    // TODO: should check for proof!
    return handleActivity(announcedActivity, verify)
  }

  return { status: 'ignored', reason: `Announce activity not implemented yet` }
}

export async function handleUnannounce(activity: APActivityUndo, _actor: APUser): Promise<ActivityHandlerResult> {
  const obj = activity.object.object
  if (!obj) {
    return { status: 'ignored', reason: 'Invalid unlike activity' }
  }
  return { status: 'ignored', reason: 'Invalid unlike activity' }
}

async function handleUpdate(activity: APActivityBase, activityActor: APUser): Promise<ActivityHandlerResult> {
  const obj = activity.object
  if (!obj || typeof obj !== 'object' || !('type' in obj)) {
    return { status: 'ignored', reason: 'Update activity with unsupported object' }
  }

  if (obj?.type === 'Note') {
    log.debug(`Update Activity with Note type incoming from ${activityActor.ap_id}`)
    log.debug(`Note content: ${JSON.stringify(obj)}`)
    const { success, data: note, error } = APNoteSchema.safeParse(obj)
    if (!success) {
      return { status: 'ignored', reason: 'Invalid Note: ' + String(error) }
    }
    return handleUpdateNote(note, activityActor)
  } else if (obj?.type === 'Event') {
    log.debug(`Update Activity with Event type incoming from ${activityActor.ap_id}`)
    log.debug(`Event content: ${JSON.stringify(obj)}`)
    const { success, data: event, error } = APEventSchema.safeParse(obj)
    if (!success) {
      return { status: 'ignored', reason: 'Invalid Note: ' + String(error) }
    }
    return handleUpdateEvent(event, activityActor)
  }

  return { status: 'ignored', reason: `Update activity with unsupported object type: ${obj.type}` }
}

/**
 * create activity could be a Note or an Event
 * Note: a Note could be a reply to an Event or another Note
 * Event: an Event could be a remote event from a trusted source
 */
async function handleCreate(activity: APActivityBase, actor: APUser): Promise<ActivityHandlerResult> {
  const obj = await dereferenceActivityObject(activity.object)

  if (!obj || typeof obj !== 'object' || !('type' in obj)) {
    return { status: 'ignored', reason: 'Create activity with unsupported object' }
  }
  log.debug(`Parse Create activity object: ${JSON.stringify(obj)}`)

  // parse the object
  const { success, data: eventOrNote, error } = obj.type === 'Event' ? APEventSchema.safeParse(obj) : obj.type === 'Note' ? APNoteSchema.safeParse(obj) : {}
  if (!success || !eventOrNote) {
    return { status: 'ignored', reason: `Invalid Create activity object: ${error?.message}` }
  }

  // check if attributedTo has same origin as actor.ap_id (authorization per FEP-fe34), i.e. mobilizon @admin create Event attributeTo others
  const ownerId = eventOrNote?.attributedTo ?? activity.actor
  let owner: APUser | undefined = actor
  if (ownerId !== activity.actor) {
    log.debug(`Object owner is different from Activity actor (and its OK): ${ownerId} - ${actor.ap_id}`)
    owner = await getActor(ownerId)
    if (!owner) {
      return { status: 'ignored', reason: `Create activity with unknown owner: ${ownerId}` }
    }
  }
  if (!sameOrigin(ownerId, actor.ap_id)) {
    return { status: 'ignored', reason: `Create activity with different actor: ${eventOrNote.attributedTo} !== ${actor.ap_id}` }
  }

  // an incoming Note could be a reply
  if (eventOrNote.type === 'Note') {
    log.debug(`Create Activity with Note by ${eventOrNote.attributedTo}`)
    log.debug(`Note content: ${JSON.stringify(obj)}`)
    return handleCreateNote(eventOrNote, targetsForActivity(activity), owner)
  } else if (eventOrNote.type === 'Event') {
    // Create > Event only allowed for trusted actor
    if (!actor.trusted) {
      return { status: 'ignored', reason: 'Not followed or not trusted' }
    }
    log.debug(`Create Activity with Event type incoming from ${actor.ap_id}`)
    return handleCreateEvent(eventOrNote, owner)
  }
  return { status: 'ignored', reason: 'Cannot be here' }
}

// https://www.w3.org/wiki/ActivityPub/Primer/Delete_activity
async function handleDelete(message: APActivityBase, actor?: APUser): Promise<ActivityHandlerResult> {
  const obj = message.object
  if (!obj) {
    return { status: 'ignored', reason: 'Delete activity with no object' }
  }

  // the id of the resource to delete could be a string or an object with an id property
  const ap_id = typeof obj === 'string' ? obj : obj.id
  log.debug(`Delete activity object id: ${ap_id}`)
  if (!ap_id) {
    return { status: 'ignored', reason: 'Delete activity with no object id' }
  }

  // check if the id to delete is a resource
  const resource = await Resource.findOne({ where: { activitypub_id: ap_id } })
  if (resource) {
    if (actor?.ap_id !== resource.apUserApId) {
      return { status: 'ignored', reason: `Delete activity actor mismatch: ${actor?.ap_id} !== ${resource.apUserApId}` }
    }

    log.debug(`Deleting resource ${resource.activitypub_id}`)
    await resource.destroy()
    return { status: 'accepted' }
  }

  // or a remote event
  const event = await Event.findOne({ where: { ap_id } })
  if (event) {
    if (actor?.ap_id !== event.apUserApId)
    {
      return { status: 'ignored', reason: `Delete activity actor mismatch: ${actor?.ap_id} !== ${event.apUserApId}` }
    }
    log.debug(`Deleting event ${event.ap_id}`)
    await event.destroy()
    return { status: 'accepted' }
  }

  // or a remote user
  const apUser = await APUser.findOne({ where: { ap_id } })
  if (apUser) {
    if (actor?.ap_id !== apUser.ap_id) {
      return { status: 'ignored', reason: `Delete activity actor mismatch: ${actor?.ap_id} !== ${apUser.ap_id}` }
    }
    log.debug(`Deleting APUser ${apUser.ap_id}`)
    await apUser.destroy()
    return { status: 'accepted' }
  }

  return { status: 'ignored', reason: `Delete activity with unknown object id: ${ap_id}` }
}
