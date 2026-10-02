import jsonld from 'jsonld'
import crypto from 'crypto'
import contexts from './contexts'
import type { LDSignature } from '../services/db'
import { useLogger } from '../lib/logger'

export async function verify(activity: { signature: LDSignature }, publicKey: string) {
  const log = useLogger('LDSignature:verify')
  const { signature, ...doc } = activity
  if (!signature) throw new Error('No signature')

  const sigOpts = {
    '@context': 'https://w3id.org/identity/v1',
    'creator': signature.creator,
    'created': signature.created
  }

  log.debug('sigOpts ', sigOpts)
  const sigOptsHash = await hashJsonLd(sigOpts).catch((e) => {
    throw new Error('Failed to hash sigOpts: ' + e)
  })

  log.debug('sigOptsHash ', sigOptsHash)

  const docHash = await hashJsonLd(doc).catch((e) => {
    throw new Error('Failed to hash doc: ' + e)
  })
  log.debug('docHash ', docHash)

  const message = sigOptsHash + docHash

  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(message)
  verifier.end()

  return verifier.verify(publicKey, signature.signatureValue, 'base64')
}

export async function sign(activity: object, privateKey: string, keyId: string): Promise<LDSignature> {
  const log = useLogger('LDSignature:sign')
  const sigOpts = {
    '@context': 'https://w3id.org/identity/v1' as const,
    'creator': keyId,
    'created': new Date().toISOString()
  }
  log.debug(sigOpts)

  const sigOptsHash = await hashJsonLd(sigOpts).catch((e) => {
    console.error(JSON.stringify(e))
    throw new Error('Failed to hash sigOpts: ' + e)
  })
  log.debug('sigOptsHash ', sigOptsHash)

  const docHash = await hashJsonLd(activity).catch((e) => {
    console.error(JSON.stringify(e))
    throw new Error('Failed to hash doc: ' + e)
  })
  log.debug('docHash ', docHash)

  // concatenate
  const message = sigOptsHash + docHash

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message)
  signer.end()

  const signatureValue = signer.sign(privateKey).toString('base64')

  return {
    ...sigOpts,
    signatureValue
  }
}

const nodeDocumentLoader = jsonld.documentLoaders.node()
export async function hashJsonLd(activity: any) {
  const canon = await jsonld.canonize(activity, {
    algorithm: 'URDNA2015',
    format: 'application/n-quads',
    documentLoader: async (url: string) => {
      if (contexts[url]) {
        return {
          contextUrl: null,
          document: contexts[url],
          documentUrl: url
        }
      }
      return nodeDocumentLoader(url)
    }
  })
  return crypto.createHash('sha256').update(canon).digest('hex')
}