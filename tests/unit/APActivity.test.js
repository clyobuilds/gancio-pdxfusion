import { describe, expect, it } from 'vitest'
import { handleActivity } from '../../server/federation/handlers'
import { getActorFromKeyId, getInstance } from '../../server/federation/lookup'
import { getActor } from '../../server/federation/get_actor'
import { connect, Event, Instance, Resource, APUser, runMigrations, APKey } from '../../server/services/db'
import { loadSettings, publicSettings, setSetting } from '../../server/services/settings'
import { applicationActorId } from '../../server/federation/helpers'
import { normalizePublicKeyToSpki } from '../../server/federation/keys'

// SETUP
const db = await connect()
await runMigrations()
await loadSettings()
await db.query('DELETE FROM events')
await db.query('DELETE FROM resources')
await db.query('DELETE FROM instances')
await db.query('DELETE FROM ap_users')
await Instance.create({
  domain: 'localhost:13120',
  applicationActor: 'http://localhost:13120/federation/u/relay',
  name: 'Test Instance',
  blocked: false,
  data: ''
})

await APUser.create({
  ap_id: 'http://localhost:13120/federation/u/relay',
  instanceDomain: 'localhost:13120',
  object: {
    id: 'http://localhost:13120/federation/u/relay',
    type: 'Person',
    inbox: 'http://localhost:13120/federation/u/relay/inbox',
    outbox: 'http://localhost:13120/federation/u/relay/outbox',
    icon: {
      type: 'Image',
      mediaType: 'image/png',
      url: 'http://localhost:13120/federation/u/relay/avatar.png'
    }
  }
})

await APKey.create({
  apUserApId: applicationActorId,
  ap_id: applicationActorId + '#main-key',
  type: 'rsa-v1_5-sha256',
  public_key: normalizePublicKeyToSpki(publicSettings.publicKey),
})

const instance = await getInstance('http://localhost:13120', false)

if (!instance) throw new Error('Instance not found')
let actor = await getActor('http://localhost:13120/federation/u/relay', false)
await actor.update({ trusted: true, following: true })
const verify = await getActorFromKeyId(`${applicationActorId}#main-key`)
if (!actor) throw new Error('Actor not found')

describe('AP Activity handler', () => {
  it('should handle a Create > Event activity from a trusted actor', async () => {
    const { default: event } = await import('../fixtures/APActivities/0-CreateEvent')
    const ret = await handleActivity(event, verify)
    expect(ret.status).toBe('accepted')

    const ev = await Event.findOne({ where: { ap_id: event.object.id } })
    expect(ev).toBeDefined()
    expect(ev.title).toBe('Create > Event')
  })

  it('should not handle a Create > Event activity from an untrusted or not following actor (adversarial)', async () => {
    const { default: event } = await import('../fixtures/APActivities/0-CreateEvent')
    event.object.id = 'http://localhost:13120/federation/m/2'
    await verify.actor.update({ trusted: false })
    let ret = await handleActivity(event, verify)
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Not followed or not trusted')

    await verify.actor.update({ trusted: true, following: false })
    ret = await handleActivity(event, verify)
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Actor not followed or not trusted')

    await verify.actor.update({ trusted: true, following: true })
    event.object.id = 'http://localhost:13120/federation/m/1'
  })

  it('should handle an Update > Event activity', async () => {
    const { default: event } = await import('../fixtures/APActivities/1-UpdateEvent')
    await handleActivity(event, verify)
    const ev = await Event.findOne({ where: { ap_id: event.object.id } })
    expect(ev).toBeDefined()
    expect(ev.title).toBe('Update > Event')
  })

  it('should fail an Update > Event from different actor (adversarial)', async () => {
    const { default: event } = await import('../fixtures/APActivities/1-UpdateEvent')
    const ret = await handleActivity(event, { actor: { ...actor, ap_id: 'different_actor_id' }, key: verify.key })
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Activity type Update actor mismatch: http://localhost:13120/federation/u/relay !== different_actor_id')
  })

  it('should fail an Update > Event on non existing event (adversarial)', async () => {
    const { default: event } = await import('../fixtures/APActivities/1-UpdateEvent')
    const ret = await handleActivity({ ...event, object: { ...event.object, id: 'non_existing_event' } }, verify)
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Event non_existing_event not found')
  })

  it('should fail to handle a Create > Note when remote resources are not enabled (adversarial)', async () => {
    await setSetting('enable_resources', false)
    const { default: event } = await import('../fixtures/APActivities/2-CreateNote')
    const ret = await handleActivity(event, verify)
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Resources are disabled in settings')
  })

  it('should handle a Create > Note to an existing event', async () => {
    await setSetting('enable_resources', true)
    const { default: activity } = await import('../fixtures/APActivities/2-CreateNote')
    const ret = await handleActivity(activity, verify)
    expect(ret.status).toBe('accepted')
    const note = await Resource.findOne({ where: { activitypub_id: activity.object.id } })
    expect(note).toBeDefined()
    expect(note.data.content).toBe('This is a note')
  })

  it('should fail to handle a Create > Note to a non existing event (adversarial)', async () => {
    await setSetting('enable_resources', true)
    const { default: activity } = await import('../fixtures/APActivities/2-CreateNote')
    const ret = await handleActivity({ ...activity, object: { ...activity.object, inReplyTo: 'http://localhost:13120/event/123' } }, verify)
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Create Activity for Note object are only supported for events or other local notes')
  })

  it('should not handle a Delete > Note with different actor (adversarial)', async () => {
    const { default: activity } = await import('../fixtures/APActivities/3-DeleteNote')
    // achttp://localhost:13120/federation/u/relay
    const ret = await handleActivity(activity, { actor: { ...actor, ap_id: 'http://localhost:13120/federation/u/different_actor' }, key: verify.key })
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Activity type Delete actor mismatch: http://localhost:13120/federation/u/relay !== http://localhost:13120/federation/u/different_actor')
    const note = await Resource.findOne({ where: { activitypub_id: activity.object.id } })
    expect(note.data.content).toBe('This is a note')
  })

  it('should handle a Delete > Note', async () => {
    const { default: activity } = await import('../fixtures/APActivities/3-DeleteNote')
    const ret = await handleActivity(activity, verify)
    expect(ret.status).toBe('accepted')
    const note = await Resource.findOne({ where: { activitypub_id: activity.object.id } })
    expect(note).toBeNull()
  })

  it('should handle a Delete > Note with id as the object', async () => {
    const { default: createNote } = await import('../fixtures/APActivities/2-CreateNote')
    await handleActivity(createNote, verify)
    const { default: activity } = await import('../fixtures/APActivities/4-DeleteIdOnlyNote')
    await handleActivity(activity, verify)
    const note = await Resource.findOne({ where: { activitypub_id: activity.object } })
    expect(note).toBeNull()
  })

  it('should handle Follow', async () => {
    const { default: activity } = await import('../fixtures/APActivities/5-Follow')
    const ret = await handleActivity(activity, verify)
    expect(ret.status).toBe('accepted')
    const user = await APUser.findOne({ where: { ap_id: activity.object } })
    expect(user).not.toBeNull()
    expect(user.follower).toBeTruthy()
  })

  it('should reject Follow signed by another actor (adversarial)', async () => {
    const { default: activity } = await import('../fixtures/APActivities/5-Follow')
    const ret = await handleActivity(activity, { actor: { ...actor, ap_id: 'http://localhost:13120/federation/u/different_actor' }, key: verify.key })
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Activity type Follow actor mismatch: http://localhost:13120/federation/u/relay !== http://localhost:13120/federation/u/different_actor')
  })

  it('should reject Unfollow signed by another actor (adversarial)', async () => {
    const { default: activity } = await import('../fixtures/APActivities/6-UndoFollow')
    const ret = await handleActivity(activity, { actor: { ...actor, ap_id: 'http://localhost:13120/federation/u/different_actor' }, key: verify.key })
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Unfollow Activity author differs from the expected actor: http://localhost:13120/federation/u/relay instead of http://localhost:13120/federation/u/different_actor')
  })

  it('should handle Undo > Follow', async () => {
    const { default: activity } = await import('../fixtures/APActivities/6-UndoFollow')
    const ret = await handleActivity(activity, verify)
    expect(ret.status).toBe('accepted')
    const user = await APUser.findOne({ where: { ap_id: activity.object.object } })
    expect(user).not.toBeNull()
    expect(user.follower).toBeFalsy()
  })

  // (e.g. the trusted source is a mastodon actor that Boost an event)
  it('should handle an Announce > Create > Event', async () => {
    const { default: activity } = await import('../fixtures/APActivities/7-AnnounceCreateEvent')
    const ret = await handleActivity(activity, verify)
    expect(ret.status).toBe('accepted')
    const ev = await Event.findOne({ where: { ap_id: activity.object.object.id } })
    expect(ev).toBeDefined()
    expect(ev.title).toBe('Announce > Create > Event')
  })

  it('should handle Like > Event', async () => {
    const { default: activity } = await import('../fixtures/APActivities/8-LikeEvent')
    const ret = await handleActivity(activity, verify)
    expect(ret.status).toBe('accepted')
    const event = await Event.findOne({ where: { ap_id: activity.object } })
    expect(event.likes.length).toBe(1)
    expect(event.likes).toStrictEqual(['http://localhost:13120/federation/u/relay'])
  })

  it('should handle Undo > Like', async () => {
    const { default: activity } = await import('../fixtures/APActivities/9-UndoLikeEvent')
    const ret = await handleActivity(activity, verify)
    expect(ret.status).toBe('accepted')
    const event = await Event.findOne({ where: { ap_id: activity.object.object } })
    expect(event.likes.length).toBe(0)
  })

  it('should handle a Delete > Event', async () => {
    const { default: activity } = await import('../fixtures/APActivities/10-DeleteEvent')
    await handleActivity(activity, verify)
    const event = await Event.findOne({ where: { ap_id: activity.object } })
    expect(event).toBeNull()
  })

  it('should handle a QuoteRequest', async () => {
    const { default: activity } = await import('../fixtures/APActivities/11-QuoteRequest')
    const ret = await handleActivity(activity, verify)
    expect(ret.status).toBe('accepted')
  })

  it('should handle a Delete > Event with non existing event (adversarial)', async () => {
    const { default: activity } = await import('../fixtures/APActivities/10-DeleteEvent')
    const ret = await handleActivity({ ...activity, object: 'non_existing_event' }, verify)
    expect(ret.status).toBe('ignored')
    expect(ret.reason).toBe('Delete activity with unknown object id: non_existing_event')
  })

  it('should be idempotent on duplicate Create (adversarial)', async () => {
    const { default: event } = await import('../fixtures/APActivities/0-CreateEvent')

    await handleActivity(event, verify)
    await handleActivity(event, verify)

    const events = await Event.findAll({ where: { ap_id: event.object.id } })
    console.error(event.object.id)
    expect(events.length).toBe(1)
  })

  it('should be idempotent on duplicate Delete (adversarial)', async () => {
    // const { default: createEvent } = await import('../fixtures/APActivities/0-CreateEvent')
    const { default: deleteEvent } = await import('../fixtures/APActivities/10-DeleteEvent')

    // await handleActivity(createEvent, verify)
    let events = await Event.findAll({ where: { ap_id: deleteEvent.object } })
    console.error(deleteEvent.object)
    expect(events.length).toBe(1)
    await handleActivity(deleteEvent, verify)
    await handleActivity(deleteEvent, verify)

    events = await Event.findAll({ where: { ap_id: deleteEvent.object } })
    expect(events.length).toBe(0)
  })

  it('should be idempotent on duplicate Like (adversarial)', async () => {
    const { default: createEvent } = await import('../fixtures/APActivities/0-CreateEvent')
    await handleActivity(createEvent, verify)
    const { default: like } = await import('../fixtures/APActivities/8-LikeEvent')
    await handleActivity(like, verify)
    await handleActivity(like, verify)
    const event = await Event.findOne({ where: { ap_id: like.object } })
    expect(event.likes.length).toBe(1)
  })

  it('should be idempotent duplicate on Follow (adversarial)', async () => {
    const { default: follow } = await import('../fixtures/APActivities/5-Follow')
    await handleActivity(follow, verify)
    await handleActivity(follow, verify)
    const user = await APUser.findAll({ where: { follower: true } })
    expect(user.length).toBe(1)
  })
})