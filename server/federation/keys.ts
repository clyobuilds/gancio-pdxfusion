import { APKey, KeyTypeEnum, type KeyType } from '../services/db'
import type { APActor } from './types'
import { useLogger } from '../lib/logger'
import { createPublicKey } from 'node:crypto'
const log = useLogger('federation/keys')

/**
 * Imports keys from an actor
 * @param actor<APActor> - the actor to import keys from
 * @returns imported keys
 */
export async function importActorKeys(actor: APActor) {
  const keys: APKey[] = []
  if (actor.publicKey) {
    log.debug(`create APKey with ap_id: ${actor.publicKey.id}`)
    const k = await APKey.upsert({
      ap_id: actor.publicKey.id,
      type: 'rsa-v1_5-sha256',
      public_key: normalizePublicKeyToSpki(actor.publicKey.publicKeyPem),
      apUserApId: actor.id
    })
    keys.push(k[0])
  }

  if (actor.assertionMethod && Array.isArray(actor.assertionMethod)) {
    for (const assertion of actor.assertionMethod) {
      if (assertion.type === 'Multikey' && assertion.publicKeyMultibase) {
        log.debug(`create APKey with ap_id: ${assertion.id}`)
        const { type, keyData } = decodePublicKeyMultibase(assertion.publicKeyMultibase)
        if (!KeyTypeEnum.includes(type)) {
          log.warn(`Unsupported key type ${type} for assertionMethod with ap_id: ${assertion.id}`)
          continue
        }
        const k = await APKey.upsert({
          ap_id: assertion.id,
          type,
          public_key: keyData,
          apUserApId: actor.id
        })
        keys.push(k[0])
      }
    }
  }
  return keys
}

export function normalizePublicKeyToSpki(pem: string): Uint8Array {
  const keyObject = createPublicKey(pem)
  const spki = keyObject.export({ format: 'der', type: 'spki' })
  return new Uint8Array(spki)
}

// https://datatracker.ietf.org/doc/html/draft-msporny-base58-03

// this is kinda dumb.
const TABLE = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

// very silly.
export function encodeBase58(data: Uint8Array): string {
  const out: number[] = []
  let n = BigInt('0x' + Buffer.from(data).toString('hex'))
  while (n > 0) {
    out.push(Number(n % 58n))
    n = n / 58n
  }
  return out.reverse().map(x => TABLE[x]).join('')
}

// another n-squared algorithm. wackiness squared.
export function decodeBase58(s: string): Uint8Array {
  const data = [...s].map(ch => TABLE.indexOf(ch) ?? 0)
  const out: number[] = []
  for (const digit of data) {
    let carry = digit
    for (const i in out) {
      out[i] = out[i]! * 58 + carry
      carry = out[i] >> 8
      out[i] &= 0xff
    }
    if (carry > 0) out.push(carry)
  }
  return Uint8Array.from(out.reverse())
}

export type algoParam = { name: string, hash?: string, saltLength?: number }
export const algoMap: { [K in KeyType]: algoParam } = {
  'rsa-v1_5-sha256': { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  'ed25519': { name: 'Ed25519' },
  'rsa-pss-sha512': { name: 'RSA-PSS', saltLength: 64, hash: 'SHA-512' }
}
export async function importCryptoKey(key: APKey): Promise<CryptoKey> {
  const algorithm = algoMap[key.type]
  const binary = new ArrayBuffer(key.public_key.byteLength)
  new Uint8Array(binary).set(key.public_key)
  return crypto.subtle.importKey('spki', binary, algorithm, false, ['verify'])
}

export function decodeMultibase(input: string): Uint8Array {
  const prefix = input[0]
  if (prefix === 'z') {
    return decodeBase58(input.slice(1))
  } else if (prefix === 'u') {
    return Buffer.from(input.slice(1), 'base64url')
  } else {
    throw new Error(`Unsupported multi-base prefix: ${input}`)
  }
}

// AHA! https://multiformats.readthedocs.io/en/latest/implementation-report.html
// also: https://github.com/multiformats/multicodec/blob/master/table.csv
const PREFIX_ED25519_PUBLIC = 'ed01' // 0xed
const PREFIX_RSA_DER_PUBLIC = '8524' // 0x1205

export function decodePublicKeyMultibase(publicKeyMultibase: string): { type: KeyType, keyData: Uint8Array } {
  const data = decodeMultibase(publicKeyMultibase)
  const ident = Buffer.from(data.slice(0, 2)).toString('hex')
  if (ident == PREFIX_ED25519_PUBLIC) {
    const rawKey = data.slice(2)
    const PREFIX_ED25519_SPKI = Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00])
    const spki = new Uint8Array(PREFIX_ED25519_SPKI.length + rawKey.length)
    spki.set(PREFIX_ED25519_SPKI)
    spki.set(rawKey, PREFIX_ED25519_SPKI.length)
    return {
      type: 'ed25519',
      keyData: spki
    }
  } else if (ident == PREFIX_RSA_DER_PUBLIC) {
    return {
      type: 'rsa-v1_5-sha256',
      keyData: data.slice(2) // This is the binary SPKI/DER structure
    }
  }
  throw new Error('Unknown Multicodec prefix in key data')
}

// for now, default to the hated base58
export function encodeMultiBase(data: Uint8Array): string {
  return 'z' + encodeBase58(data)
}

export function encodeMultiBase64(data: Uint8Array): string {
  return 'u' + Buffer.from(data).toString('base64url')
}
