import crypto from 'crypto'
import { secretSettings } from '../services/settings'
import { type H3Event, getHeader, createError } from 'h3'
import { useLogger } from '../lib/logger'
import { getActorFromKeyId } from './lookup'
import { parseHttpKeyValueHeader } from '../lib/http'
import { algoMap, importCryptoKey } from './keys'
import { applicationActorId } from './helpers'
const log = useLogger('HTTPSignature')

// http signature has to be within an hour of now
const ALLOWED_SIGNATURE_SPAN = 60 * 60 * 1000

/**
 * https://swicg.github.io/activitypub-http-signature/#how-to-sign-a-request
 */
export function prepareHTTPSignature(
  rawBody: string,
  targetUrl: string,
  method: 'post' | 'get' = 'post',
  privkey: string = secretSettings.privateKey,
  keyId: string = `${applicationActorId}#main-key`
) {
  const inboxUrl = new URL(targetUrl)
  const signer = crypto.createSign('sha256')
  const date = new Date().toUTCString()
  const pathName = inboxUrl.pathname
  const hostname = inboxUrl.hostname
  let header
  let digest
  let stringToSign
  if (method === 'post') {
    digest = crypto.createHash('sha256')
      .update(rawBody)
      .digest('base64')
    stringToSign = `(request-target): post ${pathName}\nhost: ${inboxUrl.hostname}\ndate: ${date}\ndigest: SHA-256=${digest}`
    const signature = signer.update(stringToSign).end().sign(privkey).toString('base64')
    header = `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`
  } else {
    stringToSign = `(request-target): get ${pathName}\nhost: ${hostname}\ndate: ${date}`
    const signature = signer.update(stringToSign).end().sign(privkey).toString('base64')
    header = `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date",signature="${signature}"`
  }

  return {
    host: inboxUrl.hostname,
    date,
    signature: header,
    ...(method === 'post' && ({ digest: `SHA-256=${digest}` }))
  }
}

/**
 * Verifies the HTTP signature of an incoming request.
 * https://www.w3.org/wiki/SocialCG/ActivityPub/Authentication_Authorization#Signing_requests_using_HTTP_Signatures
 * Each POST to /inbox coming from fediverse has to be verified.
 * Signature checking needs Actor's public key
 * @return APUser that signed the request in case of successfull validation
 * @throws {H3Error} throw in case of validation failure
 */
export async function verifyHTTPSignature(
  event: H3Event,
  rawBody: string
) {
  const requiredSigned = ['(request-target)', 'host', 'date']

  const signatureHeader = getHeader(event, 'signature')
  if (!signatureHeader) {
    throw createError({ status: 401, message: 'Missing signature header' })
  }
  const date = getHeader(event, 'date')
  if (!date) {
    throw createError({ status: 401, message: 'Missing date header' })
  }

  const parsedSignature = parseHttpKeyValueHeader(signatureHeader)
  if (!parsedSignature.get('keyId')) {
    throw createError({ status: 401, message: 'Missing keyId in signature header' })
  }

  if (!['rsa-sha256', 'hs2019'].includes(parsedSignature.get('algorithm') ?? '')) {
    throw createError('Only RSA-SHA256 (HS2019) is supported')
  }

  const signedDate = new Date(date).getTime()
  const receivedTime = Date.now()
  if (signedDate < receivedTime - ALLOWED_SIGNATURE_SPAN || signedDate > receivedTime + ALLOWED_SIGNATURE_SPAN) {
    throw createError('Signature no longer valid in time (expired)')
  }
  const signedHeaderKeys = (parsedSignature.get('headers') ?? '').split(' ')
  if (requiredSigned.some(key => !signedHeaderKeys.includes(key))) {
    throw createError('Some required headers aren\'t signed')
  }

  //  check digest header
  const digest = crypto.createHash('sha256')
    .update(rawBody)
    .digest('base64')

  const signature = getHeader(event, 'digest')
  const prefix = 'sha-256='
  if (!signature?.toLowerCase().startsWith(prefix)) {
    log.warn(`Unsupported digest algorithm: ${signature}`)
    throw createError({ status: 400, message: 'Unsupported digest algorithm' })
  }

  const value = signature.slice(prefix.length)
  if (value !== digest) {
    log.warn(`Signature mismatch ${value} - ${digest}`)
    throw createError({ status: 401, message: 'Signature mismatch' })
  }

  const signedHeaders = signedHeaderKeys.map(key => {
    switch (key) {
      case '(request-target)':
        return `${key}: ${event.method.toLowerCase()} ${event.path}`
      case 'host':
        return `${key}: ${event.node.req.headers.host}`
      default:
        return `${key}: ${event.headers.get(key)}`
    }
  }).join('\n')

  // get signer public key
  const signingKeyId = parsedSignature.get('keyId')
  if (!signingKeyId) {
    throw createError('Missing signing actor URL in keyId')
  }

  const ret = await getActorFromKeyId(signingKeyId)
  if (!ret?.actor || !ret.key) {
    throw createError(`Signing actor not found for keyId ${signingKeyId}`)
  }
  const { actor, key } = ret
  log.debug(`Verifying signature from ${signingKeyId} (actor ${actor?.ap_id})`)
  const publicKey = await importCryptoKey(key)
  const verified = await crypto.subtle.verify(
    algoMap[key.type],
    publicKey,
    Buffer.from(parsedSignature.get('signature') ?? '', 'base64'),
    Buffer.from(signedHeaders))

  if (!verified) {
    throw createError('Mismatched signature')
  }

  log.debug('Valid signature from %s', actor?.ap_id)
  return { actor, key }
}