import { describe, expect, it, vi } from 'vitest'
import { verify, sign } from '../../server/federation/ldsignature'
import { APUser, connect, Event, runMigrations } from '../../server/services/db'
import { loadSettings } from '../../server/services/settings'
import { buildEventActivity } from '../../server/federation/events'
import { now } from '../api/setup'
import { handleActivity } from '../../server/federation/handlers'
import { getActor } from '../../server/federation/get_actor'

const { default: event } = await import('../fixtures/APEvent/minimum.json')
const { default: aliceActor, privateKey: alicePrivateKey } = await import('../fixtures/APActors/Alice')

vi.mock('../../server/federation/lookup')
const mockedGetActor = vi.mocked(getActor)

await connect()
await runMigrations()
await loadSettings()

describe.todo('LDSignature', () => {
  it('should sign and verify a signature', async () => {
    const signature = await sign(event, alicePrivateKey, aliceActor.publicKey.id)
    expect(signature).toBeDefined()
    expect(signature).toHaveProperty('signatureValue')
    const result = await verify({ ...event, signature }, aliceActor.publicKey.publicKeyPem)
    expect(result).toBe(true)
  })

  it('should fail to verify an invalid signature', async () => {
    const signature = await sign(event, alicePrivateKey, aliceActor.publicKey.id)
    signature.signatureValue = 'bad' + signature.signatureValue
    const result = await verify({ ...event, signature }, aliceActor.publicKey.publicKeyPem)
    expect(result).toBe(false)
  })

  // verify when Announce activity comes from different actor:
  // we trust the actor that is announcing because of HTTPSignature but not the
  // announcing object
  it('should verify an announced event from different actor', async () => {
    // create an Event
    const [actor] = await APUser.upsert({ ap_id: aliceActor.id, object: aliceActor, trusted: true, follower: true, following: true })
    const event = {
      title: 'Event to be Announced',
      place_name: 'test',
      place_address: 'test',
      start_datetime: now(),
      end_datetime: now() + 1000,
      is_visible: true,
      apUserApId: aliceActor.id,
      ap_object: { attributedTo: aliceActor.id }
    }
    const evt = await Event.create(event)
    const activity = await buildEventActivity(evt, [], 'Announce', alicePrivateKey, aliceActor.publicKey.id)
    mockedGetActor.mockResolvedValue(actor)
    await handleActivity(activity, actor)
    const e = await Event.findOne({ where: { title: 'Event to be Announced' }, include: [{ model: APUser, as: 'APUser', required: true }] })
    expect(e?.title).toBe('Event to be Announced')
    expect(e?.APUser.ap_id).toBe('http://localhost:13120/federation/u/alice')
  })
})
