import { publicSettings } from '../services/settings'
import { useLogger } from '../lib/logger'
import { signAndSend } from './sign_and_send'
import crypto from 'crypto'
import type { APActivityBase, APActivityUndo } from './types'
import type { APUser } from '../services'
import { applicationActorId, isApplicationActor } from './helpers'
import type { ActivityHandlerResult } from './handlers'

const log = useLogger('AP follow')

// follow request from fediverse
// https://www.w3.org/wiki/ActivityPub/Primer/Follow_activity
export async function handleFollow(activity: APActivityBase, actor: APUser): Promise<ActivityHandlerResult> {
  if (typeof activity?.object !== 'string') {
    return { status: 'ignored', reason: 'Follow Activity with non string object not supported' }
  }
  if (!isApplicationActor(activity.object)) {
    log.warn(`Following the wrong actor: ${activity.object} instead of ${applicationActorId} (could be a wrong config.baseurl)`)
    return { status: 'ignored', reason: 'Actor not found' }
  }

  if (activity.actor !== actor.ap_id) {
    log.warn(`Follow Activity author differs from the expected actor: ${activity.actor} instead of ${actor.ap_id}`)
    return { status: 'ignored', reason: 'Wrong actor' }
  }

  log.info(`Followed by ${activity.actor} | ${actor.ap_id}`)
  const guid = crypto.randomUUID()
  const message = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    'id': `${publicSettings.baseurl}/federation/${guid}`,
    'type': 'Accept' as const,
    'actor': applicationActorId,
    'object': activity
  }
  await signAndSend(message, actor.object.inbox)
  await actor.update({ follower: true })
  return { status: 'accepted' }
}

// unfollow request from fediverse
export async function handleUnfollow(undoActivity: APActivityUndo, actor: APUser): Promise<ActivityHandlerResult> {
  const actorToUnfollow = undoActivity.object.object // Undo > Follow > object > object is the actor to unfollow
  // can unfollow only the application actor
  if (!isApplicationActor(actorToUnfollow)) {
    return { status: 'ignored', reason: `Unfollowing wrong user: ${actorToUnfollow} instead of ${applicationActorId}` }
  }

  if (undoActivity.actor !== actor.ap_id) {
    return { status: 'ignored', reason: `Unfollow Activity author differs from the expected actor: ${undoActivity.actor} instead of ${actor.ap_id}` }
  }

  await actor.update({ follower: false })
  log.info(`Unfollowed by ${actor.ap_id}`)
  return { status: 'accepted' }
}
