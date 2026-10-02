import { describe, expect, it, vi } from 'vitest'
import { prepareHTTPSignature, verifyHTTPSignature } from '../../server/federation/httpsignature'
import { loadSettings, publicSettings, secretSettings } from '../../server/services/settings'
import { APKey, APUser } from '../../server/services/db'
import { decodeStructuredField, encodeStructuredField } from '../../server/federation/http_dict'
import { mockH3Event } from './utils'
import { parseHttpKeyValueHeader } from '../../server/lib/http'
import { decodePublicKeyMultibase, importActorKeys, normalizePublicKeyToSpki } from '../../server/federation/keys'
import { cleanDatabase } from '../api/setup'
import { applicationActorId } from '../../server/federation/helpers'
import type { APActor } from '../../server/federation/types'
import { getActorFromKeyId } from '../../server/federation/lookup'

// mock the lookup.getActorFromKeyId
vi.mock('../../server/federation/lookup')
const mockedGetActorFromKeyId = vi.mocked(getActorFromKeyId)

// store the real lookup too
const realLookup = await vi.importActual<typeof import('../../server/federation/lookup')>('../../server/federation/lookup')

await cleanDatabase(true)
await loadSettings()

const actor = {
  ap_id: 'https://a.com/u/test',
  blocked: false,
  object: {
    publicKey: {
      publicKeyPem: publicSettings.publicKey,
      id: 'http://localhost:13120/federation/u/relay#main-key',
      owner: 'http://localhost:13120/federation/u/relay'
    }
  }
}

const Alice = await APUser.create({
  ap_id: applicationActorId,
  blocked: false,
  instanceDomain: publicSettings.instanceDomain,
  object: {
    id: applicationActorId,
    name: 'alice',
    preferredUsername: 'alice',
    inbox: 'https://example.com/alice/inbox',
    outbox: 'https://example.com/alice/outbox',
    type: 'Person',
    icon: { url: '' }
  }
})

const AliceKey = await APKey.create({
  apUserApId: Alice.ap_id,
  ap_id: applicationActorId + '#main-key',
  type: 'rsa-v1_5-sha256',
  public_key: normalizePublicKeyToSpki(publicSettings.publicKey),
})

describe('HTTPS Signature', () => {
  it('should parse HTTP key/value header', () => {
    expect(parseHttpKeyValueHeader('')).toEqual(new Map([]))
    expect(parseHttpKeyValueHeader('key=value')).toEqual(new Map([['key', 'value']]))
    expect(parseHttpKeyValueHeader('a=b,c=d,e=,=fff')).toEqual(new Map([
      ['a', 'b'],
      ['c', 'd'],
      ['e', ''],
      ['', 'fff']
    ]))

    expect(parseHttpKeyValueHeader(`key="value",name="a=b",other="c,d,e=f,g"`)).toEqual(new Map([
      ['key', 'value'],
      ['name', 'a=b'],
      ['other', 'c,d,e=f,g']
    ]))

    const REAL = `keyId="${actor.object.publicKey.id}",algorithm="rsa-sha256",headers="(request-target) host date digest content-type",signature="CoqTCV+UnsFSdzAt64tg/K9+ySq3pZMAHajzYuA43C/ICK4WqARUbPpEbf83+7OB/G77SYA/Qr27GeG5a3+3wIRjuDXe5ZR9R0b2/O0GPWpF8NE8owLLf1NrtQh1wILPkAr/15OITXnoDraKkDPohVHfFeF9rsJmfMC/fv6LQBLwL36wGqJlPI1WeL1M+steZGRp92lTfjFlxYgO+Lv5kigSn5BWgV+q5sIGG79kEgHKSy17Ftoaic378xMri+IOvTKQKXTPuimWqyHm4aWL/t7EeyZFllbIXEkQA8H1nwZVK5Y6/hazpJfhB1RiEAbHy5rKCz+RYC+sv3pgAVHQEw=="`
    expect(parseHttpKeyValueHeader(REAL)).toEqual(new Map([
      ['keyId', actor.object.publicKey.id],
      ['algorithm', 'rsa-sha256'],
      ['headers', '(request-target) host date digest content-type'],
      ['signature', 'CoqTCV+UnsFSdzAt64tg/K9+ySq3pZMAHajzYuA43C/ICK4WqARUbPpEbf83+7OB/G77SYA/Qr27GeG5a3+3wIRjuDXe5ZR9R0b2/O0GPWpF8NE8owLLf1NrtQh1wILPkAr/15OITXnoDraKkDPohVHfFeF9rsJmfMC/fv6LQBLwL36wGqJlPI1WeL1M+steZGRp92lTfjFlxYgO+Lv5kigSn5BWgV+q5sIGG79kEgHKSy17Ftoaic378xMri+IOvTKQKXTPuimWqyHm4aWL/t7EeyZFllbIXEkQA8H1nwZVK5Y6/hazpJfhB1RiEAbHy5rKCz+RYC+sv3pgAVHQEw==']
    ]))
  })

  it('should accepts valid signature and digest', async () => {
    const body = { actor: applicationActorId, type: 'Create' as const }

    const headers = prepareHTTPSignature(JSON.stringify(body), 'https://example.com/alice/inbox', 'post', secretSettings.privateKey)
    const event = mockH3Event({ body, headers, url: '/alice/inbox' })

    mockedGetActorFromKeyId.mockResolvedValueOnce({ actor: Alice, key: AliceKey })

    const ret = await verifyHTTPSignature(event, JSON.stringify(body))
    expect(ret?.actor.ap_id).toBe(body.actor)
  })

  it('should rejects when signature header is missing', async () => {
    const body = { actor: 'https://a.com/u/test', type: 'Create' as const }
    const event = mockH3Event({ body })

    await expect(verifyHTTPSignature(event, JSON.stringify(body)))
      .rejects.toThrow('Missing signature header')
  })

  it('should rejects when date header is missing', async () => {
    const body = { actor: 'https://a.com/u/test', type: 'Create' as const }
    const headers = { signature: 'test' }
    const event = mockH3Event({ body, headers })

    await expect(verifyHTTPSignature(event, JSON.stringify(body)))
      .rejects.toThrow('Missing date header')
  })

  it('rejects when keyId is missing', async () => {
    const body = { type: 'Create' as const }
    const event = mockH3Event({ body, headers: { signature: 'test', date: new Date().toUTCString() } })

    await expect(verifyHTTPSignature(event, JSON.stringify(body)))
      .rejects.toThrow('Missing keyId in signature header')
  })

  // it('rejects when instance is blocked', async () => {
  //   const body: APActivityBase = { actor: 'https://a.com/u/test', type: 'Create' as const }
  //   const headers = await prepareHTTPSignature(JSON.stringify(body), 'https://a.com/inbox', 'post', secretSettings.privateKey)
  //   const event = mockH3Event({ body, headers })

  //   mockedGetActorFromKeyId.mockResolvedValue({ blocked: false, instance: { blocked: true } })

  //   await expect(verifyHTTPSignature(event, JSON.stringify(body), body))
  //     .rejects.toThrow('Instance blocked')
  // })

  // it('rejects when actor is blocked', async () => {
  //   const body: APActivityBase = { actor: 'https://a.com/u/test', type: 'Create' as const }
  //   const headers = await prepareHTTPSignature(JSON.stringify(body), 'https://a.com/inbox', 'post', secretSettings.privateKey)
  //   const event = mockH3Event({ body, headers })

  //   mockedGetActor.mockResolvedValue({ blocked: true, instance: { blocked: false } })

  //   await expect(verifyHTTPSignature(event, JSON.stringify(body), body))
  //     .rejects.toThrow('Actor blocked')
  // })

  it('should rejects when actor has no public key', async () => {
    const body = { actor: 'https://a.com/u/test', type: 'Create' }
    const headers = prepareHTTPSignature(JSON.stringify(body),
      'https://example.com/alice/inbox', 'post', secretSettings.privateKey, actor.object.publicKey.id.replace('#main-key', '#missing-key'))
    const event = mockH3Event({ body, headers })

    await expect(verifyHTTPSignature(event, JSON.stringify(body)))
      .rejects.toThrow('Signing actor not found for keyId http://localhost:13120/federation/u/relay#missing-key')
  })

  it('should rejects when digest does not match body', async () => {
    const body = { actor: 'https://a.com/u/test', type: 'Create' }
    const headers = prepareHTTPSignature(JSON.stringify(body), 'https://example.com/alice/inbox', 'post', secretSettings.privateKey)

    const event = mockH3Event({
      body,
      headers: {
        ...headers,
        digest: 'SHA-256=invaliddigest'
      }
    })

    mockedGetActorFromKeyId.mockResolvedValue({ actor: { ...Alice, instance: { blocked: false } }, key: AliceKey })

    await expect(verifyHTTPSignature(event, JSON.stringify(body)))
      .rejects.toThrow('Signature mismatch')
  })
})

describe('RFC 521a - Representing actor’s public keys', () => {
  it('should decode public key multibase', () => {
    const pk_ed25519 = 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'
    const pk_rsa = 'z4MXj1wBzi9jUstyPMS4jQqB6KdJaiatPkAtVtGc6bQEQEEsKTic4G7Rou3iBf9vPmT5dbkm9qsZsuVNjq8HCuW1w24nhBFGkRE4cd2Uf2tfrB3N7h4mnyPp1BF3ZttHTYv3DLUPi1zMdkULiow3M1GfXkoC6DoxDUm1jmN6GBj22SjVsr6dxezRVQc7aj9TxE7JLbMH1wh5X3kA58H3DFW8rnYMakFGbca5CB2Jf6CnGQZmL7o5uJAdTwXfy2iiiyPxXEGerMhHwhjTA1mKYobyk2CpeEcmvynADfNZ5MBvcCS7m3XkFCMNUYBS9NQ3fze6vMSUPsNa6GVYmKx2x6JrdEjCk3qRMMmyjnjCMfR4pXbRMZa3i'

    const ed25519 = decodePublicKeyMultibase(pk_ed25519)
    const rsa = decodePublicKeyMultibase(pk_rsa)

    expect(ed25519.type).toEqual('ed25519')
    expect(Buffer.from(ed25519.keyData).toString('hex')).toEqual('302a300506032b65700321002e6fcce36701dc791488e0d0b1745cc1e33a4c1c9fcc41c63bd343dbbe0970e6')

    expect(rsa.type).toEqual('rsa-v1_5-sha256')
    expect(Buffer.from(rsa.keyData).toString('hex')).toEqual('3082010a0282010100b1b5fcd8d4d5e88ca5c4287b31f578865caf6a78826a3b8ff7b1b23aa4af4e6a0474139f945bd9d3a911ffd0fa72db78e4593a86c91f9da836186ebd3402d51f6a3844247ab5088b46929c311b43604fed84499f06f0f39bf55590e2187f1bbe229ba8f49fd2e570cd0e3733c76bfede80e1e7e0881e4538ea1bc5782be9512f8bf132526e05f4923564fe6e1e21bf7087adebb660fa533fca06d0a8e66991e1312d70b64a61da8ca77c028cdf939601e2cffe2855759b1d479f0847bcac59d7d62427a431d4e3dfd2697428b9dd6309a7b1167db99fe01af1ff1b739566fb949e47089d1dae84aef1214ef7f5773e86a0d3e9da246f9bec09d60c705891183d0203010001')
  })

  it('should import every public keys from actor', async () => {
    const { default: actor } = await import('../fixtures/APActors/Bob')
    await APUser.upsert({
      ap_id: actor.id,
      object: actor,
      blocked: false
    })

    const keys = await importActorKeys(actor as APActor)
    expect(keys).toBeDefined()
    expect(keys).toHaveLength(3)
    // check with old public key
    let ret = await realLookup.getActorFromKeyId(actor.publicKey.id)
    // const a = await APUser.findOne({ include: [{ model: APKey, where: { ap_id: actor.publicKey.id }, required: true }] })
    expect(ret!.key.ap_id).toEqual(actor.publicKey.id)
    expect(ret!.key.type).toEqual('rsa-v1_5-sha256')
    expect(ret!.key.public_key).toBeInstanceOf(Uint8Array)
    expect(ret!.key.public_key.length).toBeGreaterThan(0)
    expect(ret!.key.apUserApId).toEqual(actor.id)

    // check with ed25519
    ret = await realLookup.getActorFromKeyId(actor.assertionMethod[0].id)
    expect(ret!.key.ap_id).toEqual(actor.assertionMethod[0].id)
    expect(ret!.key.type).toEqual('ed25519')
    expect(ret!.key.public_key).toBeInstanceOf(Uint8Array)
    expect(ret!.key.apUserApId).toEqual(actor.id)

    // check with rsa-v1_5-sha256
    ret = await realLookup.getActorFromKeyId(actor.assertionMethod[1].id)
    expect(ret!.key.ap_id).toEqual(actor.assertionMethod[1].id)
    expect(ret!.key.type).toEqual('rsa-v1_5-sha256')
    expect(ret!.key.public_key).toBeInstanceOf(Uint8Array)
    expect(ret!.key.apUserApId).toEqual(actor.id)
  })
})

describe('RFC 9421 Signature', () => {
  it('encode/decode structured field', () => {
    const v1 = decodeStructuredField(`en="Applepie", da=:w4ZibGV0w6ZydGU=:`)
    expect([...v1.keys()]).toEqual(['en', 'da'])
    expect(v1.get('en')!.value).toEqual('Applepie')
    expect(Buffer.from(v1.get('da')!.value as Uint8Array).toString('hex')).toEqual('c386626c6574c3a6727465')
    expect(encodeStructuredField(v1)).toEqual(`en="Applepie", da=:w4ZibGV0w6ZydGU=:`)

    const v2 = decodeStructuredField(`a=?0, b, c; foo=bar`)
    expect([...v2.keys()]).toEqual(['a', 'b', 'c'])
    expect(v2.get('a')!.value).toEqual(false)
    expect(v2.get('b')!.value).toEqual(true)
    expect(v2.get('c')!.value).toEqual(true)
    expect([...v2.get('c')!.params!.keys()]).toEqual(['foo'])
    expect(v2.get('c')!.params!.get('foo')).toEqual('bar')
    expect(encodeStructuredField(v2)).toEqual(`a=?0, b=?1, c=?1;foo="bar"`)

    const v3 = decodeStructuredField(`rating=1.5, feelings=(joy sadness)`)
    expect([...v3.keys()]).toEqual(['rating', 'feelings'])
    expect(v3.get('rating')!.value).toEqual(1.5)
    expect(v3.get('feelings')!.value).toEqual(['joy', 'sadness'])
    expect(encodeStructuredField(v3)).toEqual(`rating=1.5, feelings=("joy" "sadness")`)

    const v4 = decodeStructuredField(`a=(1 2), b=3, c=4;aa=bb, d=(5 6);valid`)
    expect([...v4.keys()]).toEqual(['a', 'b', 'c', 'd'])
    expect(v4.get('a')!.value).toEqual([1, 2])
    expect(v4.get('b')!.value).toEqual(3)
    expect(v4.get('c')!.value).toEqual(4)
    expect([...v4.get('c')!.params!.keys()]).toEqual(['aa'])
    expect(v4.get('c')!.params!.get('aa')).toEqual('bb')
    expect(v4.get('d')!.value).toEqual([5, 6])
    expect([...v4.get('d')!.params!.keys()]).toEqual(['valid'])
    expect(v4.get('d')!.params!.get('valid')).toEqual(true)
    expect(encodeStructuredField(v4)).toEqual(`a=(1 2), b=3, c=4;aa="bb", d=(5 6);valid`)
  })
})