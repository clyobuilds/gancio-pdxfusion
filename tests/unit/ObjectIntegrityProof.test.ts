import { describe, expect, it, vi } from 'vitest'
import { getActorFromKeyId } from '../../server/federation/lookup'
import { decodePublicKeyMultibase } from '../../server/federation/keys'
import { verifyProof } from '../../server/federation/object_integrity_proof'

vi.mock('../../server/federation/lookup')

const mockedGetActorFromKeyId = vi.mocked(getActorFromKeyId)

const actor = {
  id: 'https://server.example/users/alice',
  assertionMethod: [
    {
      id: 'https://server.example/users/alice#ed25519-key',
      type: 'Multikey',
      controller: 'https://server.example/users/alice',
      publicKeyMultibase: 'z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2'
    }
  ]
}

const activity = {
  '@context': [
    'https://www.w3.org/ns/activitystreams',
    'https://w3id.org/security/data-integrity/v1'
  ],
  'id': 'https://server.example/activities/1',
  'type': 'Create',
  'actor': 'https://server.example/users/alice',
  'object': {
    id: 'https://server.example/objects/1',
    type: 'Note',
    attributedTo: 'https://server.example/users/alice',
    content: 'Hello world',
    location: {
      type: 'Place',
      longitude: -71.184902,
      latitude: 25.273962
    }
  },
  'proof': {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/data-integrity/v1'
    ],
    'type': 'DataIntegrityProof',
    'cryptosuite': 'eddsa-jcs-2022',
    'verificationMethod': 'https://server.example/users/alice#ed25519-key',
    'proofPurpose': 'assertionMethod',
    'proofValue': 'zLaewdp4H9kqtwyrLatK4cjY5oRHwVcw4gibPSUDYDMhi4M49v8pcYk3ZB6D69dNpAPbUmY8ocuJ3m9KhKJEEg7z',
    'created': '2023-02-24T23:36:38Z'
  }
}

describe('Object Integrity Proof', () => {
  it('should verify the FEP-8b32 feature', async () => {
    const { type, keyData } = decodePublicKeyMultibase(actor.assertionMethod[0].publicKeyMultibase)

    mockedGetActorFromKeyId.mockResolvedValueOnce({ actor: { ap_id: actor.id }, key: { type, public_key: keyData } })
    let ret = await verifyProof(activity)
    expect(ret?.actor.ap_id).toEqual(actor.id)
    activity.object.location.latitude = 2
    mockedGetActorFromKeyId.mockResolvedValueOnce({ actor: { ap_id: actor.id }, key: { type, public_key: keyData } })
    ret = await verifyProof(activity)
    expect(ret).toBeUndefined()
    activity.object.location.latitude = 25.273962
  })

  it('should remove an old signature field', async () => {
    const { type, keyData } = decodePublicKeyMultibase(actor.assertionMethod[0].publicKeyMultibase)
    mockedGetActorFromKeyId.mockResolvedValueOnce({ actor: { ap_id: actor.id }, key: { type, public_key: keyData } })
    const ret = await verifyProof({ ...activity, signature: { test: 2 } })
    expect(ret?.actor.ap_id).toEqual(actor.id)
  })

  // it('should sign the FEP-8b32', async () => {
  //   const unsignedActivity = (({ proof, ...other }) => other)(activity)
  // })
})