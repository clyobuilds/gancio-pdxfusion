import crypto, { timingSafeEqual } from 'crypto'
import { decodeStructuredField, type DictValue, encodeDictValue, type FieldValue } from './http_dict'
import { algoMap, importCryptoKey } from './keys'
import { useLogger } from '../lib/logger'
import { getActorFromKeyId } from './lookup'
import { type H3Event, getHeader, createError } from 'h3'
import type { KeyType } from '../services/db'

const log = useLogger('HTTP Message Signature')
// http signature has to be within an hour of now
const ALLOWED_SIGNATURE_SPAN = 60 * 60 * 1000

export interface HttpRequestMetadata {
  method: string // POST
  scheme: string // https
  host: string // www.example.com
  target: string // /path?param=value
}

function makeMagicFields(metadata: HttpRequestMetadata, inputValue: DictValue): Map<string, string> {
  const qIndex = metadata.target.indexOf('?')
  const path = qIndex < 0 ? metadata.target : metadata.target.slice(0, qIndex)
  const query = qIndex < 0 ? '' : metadata.target.slice(qIndex)
  return new Map<string, string>([
    ['@method', metadata.method],
    ['@target-uri', `${metadata.scheme}://${metadata.host}${metadata.target}`],
    ['@authority', metadata.host.toLowerCase()],
    ['@scheme', metadata.scheme],
    ['@request-target', metadata.target],
    ['@path', path],
    ['@query', query],
    ['@signature-params', encodeDictValue(inputValue)]
  ])
}

/**
 * Verify a RFC 9421 signature
 */
export async function verifyRFCSignature(event: H3Event, rawBody: string) {
  const signatureInput = getHeader(event, 'signature-input')
  if (signatureInput === undefined) return
  const input = decodeStructuredField(signatureInput)
  if (!input.size)
  {
    log.info('No signature input found')
    throw createError({ status: 401, message: 'No signature input found' })
  }
  log.debug('Signature input ', input, signatureInput)

  // only support one signature
  const [sigLabel, inputValue] = input.entries().next().value!
  const sigKey = inputValue.params?.get('keyid')?.toString()
  if (!sigKey) return

  log.debug('Key ', sigKey)

  const ret = await getActorFromKeyId(sigKey)
  if (!ret) {
    log.debug(`Actor ${sigKey} not found or has no keys`)
    return
  }

  const { actor, key } = ret

  const metadata: HttpRequestMetadata = {
    method: event.method,
    scheme: event.headers.get('x-forwarded-proto') ?? 'https',
    host: event.headers.get('host') ?? '',
    target: event.path
  }

  function buffersEqual(
    a: Uint8Array | ArrayBuffer,
    b: Uint8Array | ArrayBuffer
  ): boolean {
    if (a.byteLength !== b.byteLength) return false
    return timingSafeEqual(a, b)
  }

  // is there a content-digest? RFC-9530
  const digestHeader = event.headers.get('content-digest')
  if (!digestHeader) throw new Error('No content-digest')
  const digest = decodeStructuredField(digestHeader)
  const digestSha256 = digest.get('sha-256')?.value
  const digestSha512 = digest.get('sha-512')?.value
  if (digestSha512 !== undefined) {
    if (!(digestSha512 instanceof Uint8Array)) throw new Error('Digest is wrong type')
    const computed = await crypto.subtle.digest('SHA-512', Buffer.from(rawBody))
    if (!buffersEqual(computed, digestSha512)) throw new Error('Incorrect content-digest')
  } else if (digestSha256 !== undefined) {
    if (!(digestSha256 instanceof Uint8Array)) throw new Error('Digest is wrong type')
    const computed = await crypto.subtle.digest('SHA-256', Buffer.from(rawBody))
    if (!buffersEqual(computed, digestSha256)) throw new Error('Incorrect content-digest')
  } else {
    throw new Error(`Unsupported digest type: ${[...digest.keys()].join(', ')}`)
  }

  // parse signature headers
  const sigHeader = event.headers.get('signature')
  if (!sigHeader) throw new Error('Not signed')
  const sig = decodeStructuredField(sigHeader)
  const sigValue = sig.get(sigLabel)
  log.debug('signature', sigValue, sigHeader)

  if (inputValue === undefined || sigValue === undefined) throw new Error('Mismatched signature fields')
  if (!Array.isArray(inputValue.value) || !(sigValue.value instanceof Uint8Array)) {
    throw new Error('Wrong types on signature fields')
  }

  const fields = (inputValue.value as FieldValue[]).map(x => x.toString())
  const signatureData = sigValue.value as Uint8Array

  const requiredFields = ['@method', '@target-uri', 'date']
  for (const r of requiredFields ?? []) {
    if (!fields.includes(r)) throw new Error(`Signature missing required field: ${r}`)
  }
  if (fields.length > new Set(fields).size) throw new Error('Duplicate fields in field list')

  const created = Number(inputValue.params?.get('created') ?? '0')
  const expires = Number(inputValue.params?.get('expires') ?? '0')
  if (expires > 0 && expires < Math.floor(Date.now() / 1000)) {
    throw new Error('Signature has expired')
  }

  if (created > 0) {
    log.debug('Signature created at %s, now is %s', new Date(created * 1000).toISOString(), new Date().toISOString())
    const now = Date.now()
    if (created * 1000 < now - ALLOWED_SIGNATURE_SPAN || created * 1000 > now + ALLOWED_SIGNATURE_SPAN) {
      throw new Error('Signature is too old')
    }
  }
  const alg = inputValue.params?.get('alg') as KeyType | undefined
  if (!alg || !algoMap[alg]) throw new Error(`Incorrect signature type: ${alg}`)

  const magicFields = makeMagicFields(metadata, inputValue)
  if (!fields.every(f => magicFields.has(f) || event.headers.get(f) !== null)) {
    throw new Error(`Unknown field/header in signature list: ${fields.join(', ')}`)
  }
  const data = [...fields, '@signature-params'].map(f => {
    return `"${f}": ` + (magicFields.get(f) ?? event.headers.get(f) ?? '?')
  }).join('\n')

  log.debug(`Debug magic fields ${data}`)

  const publicKey = await importCryptoKey(key)
  const verified = await crypto.subtle.verify(algoMap[alg], publicKey, Buffer.from(signatureData), Buffer.from(data))

  if (!verified) {
    throw new Error('Signature verification failed')
  }

  log.info(`RFC 9421 signature! from ${actor?.ap_id}`)
  return { actor, key }
}

// export async function prepareRFCSignature(
//   rawBody: string,
//   targetUrl: string,
//   method: 'post' | 'get' = 'post',
//   privkey: string,
//   keyId: string = `${publicSettings.baseurl}/federation/u/${publicSettings.instance_name}#main-key`
// ) {
//   const headers: Record<string, string> = {}
//   // add a digest of the content?
//   if (rawBody !== undefined) {
//     const digest = Buffer.from(await crypto.subtle.digest('SHA-256', Buffer.from(rawBody)))
//     headers['content-digest'] = encodeStructuredField(new Map([['sha-256', { value: digest }]]))
//   }

//   // i don't remember why we push the timestamp back by 1 minute. i assume a
//   // server was picky about future times and had a bad clock.
//   const now = Date.now() - 60_000
//   const dateHeader = new Date(now).toUTCString()
//   headers['date'] = dateHeader

//   // fields to sign:
//   const fields = ['@method', '@target-uri']
//   // technically query is covered by target-uri, but appease tootik here:
//   if (targetUrl.includes('?')) fields.push('@query')
//   if (rawBody !== undefined) fields.push('content-type', 'content-digest')
//   fields.push('date')

//   const inputValue: DictValue = {
//     value: fields,
//     params: new Map<string, FieldValue>([
//       ['created', Math.floor(now / 1000)],
//       ['alg', KEY_ALGORITHM_MAP.get('rsa')!],
//       ['keyid', keyId]
//     ])
//   }

//   // ok, pull out the scheme/host/target from the url.
//   const u = new URL(targetUrl)
//   const metadata = {
//     method: method.toUpperCase(),
//     scheme: u.protocol.replace(/:$/, ''),
//     host: u.host,
//     target: u.pathname + u.search
//   }

//   // build the blob to sign.
//   const magicFields = makeMagicFields(metadata, inputValue)
//   if (!fields.every(f => magicFields.has(f) || headers[f] !== undefined)) {
//     throw new Error(`Unknown field/header in signature list: ${fields.join(', ')}`)
//   }
//   const data = [...fields, '@signature-params'].map(f => {
//     return `"${f}": ` + (magicFields.get(f) ?? headers[f] ?? '?')
//   }).join('\n')
//   const signature = new Uint8Array(await crypto.subtle.sign(KEY_ALGORITHM_MAP.get('rsa')!, privkey, data))

//   // const signature = await signWithKey(privkey, Buffer.from(data))

//   // add the headers
//   headers['signature-input'] = encodeStructuredField(new Map([['squidcity', inputValue]]))
//   headers['signature'] = encodeStructuredField(new Map([['squidcity', { value: signature }]]))
// }
