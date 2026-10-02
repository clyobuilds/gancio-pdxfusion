import { verifyHTTPSignature } from '~~/server/federation/httpsignature'
import { verifyRFCSignature } from '~~/server/federation/rfcsignature'
import { useLogger } from '~~/server/lib/logger'
import { handleActivity } from '~~/server/federation/handlers'
import { APActivityBaseSchema, type APProof } from '~~/server/federation/types'
import { defineEventHandler, readRawBody, createError, setResponseStatus, setResponseHeader, getHeader, type H3Event } from 'h3'
import { publicSettings } from '~~/server/services'
import { verifyProof } from '~~/server/federation/object_integrity_proof'

/**
 * Verify the HTTP signature of an incoming ActivityPub request
 */
export async function verifySignature(event: H3Event, rawBody: string) {
  const log = useLogger('AP Verify Signature')
  // check signature's type
  const sigHeader = getHeader(event, 'signature')
  if (sigHeader === undefined) return

  const signatureInput = getHeader(event, 'signature-input')

  // draft
  if (sigHeader.includes('(request-target)')) {
    log.debug('Verify legacy HTTP cavage signature')
    return verifyHTTPSignature(event, rawBody)
  // rfc
  } else if (signatureInput !== undefined) {
    log.debug('Verify RFC Signature - FEP 8b32')
    return verifyRFCSignature(event, rawBody)
  }
}

/**
 * Federation route handler for ActivityPub (AP) POST requests to /inbox.
 *
 * This route verifies the HTTP signature, parses the AP message,
 * and dispatches handling logic based on the message type.
 *
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('AP inbox')

  // check destination inbox
  const destActorName = event.context?.params?.name
  if (!destActorName) {
    log.info('Invalid /inbox request')
    throw createError({ status: 401, message: 'Invalid actor name' })
  }

  // only the instance shared inbox is supported
  if (destActorName !== publicSettings.instance_name) {
    log.info(`No record found for ${destActorName} (applicationActor is ${publicSettings.instance_name})`)
    throw createError({ status: 404, message: `No actor found for ${destActorName} (applicationActor is ${publicSettings.instance_name})` })
  }

  // read and parse the raw body
  const rawBody = await readRawBody(event)
  if (!rawBody) throw createError({ status: 400, message: 'Empty body' })

  // parse the activity and check if it is a valid AP activity
  let activity: unknown
  try {
    activity = JSON.parse(rawBody.toString())
  } catch {
    throw createError({ status: 400, message: 'Invalid JSON body' })
  }

  const { success, data: activityData, error } = APActivityBaseSchema.safeParse(activity)
  if (!success || !activityData) {
    log.warn('Wrong AP activity: %s', error.issues[0]?.message)
    log.error(error)
    log.debug(JSON.stringify(activity, null, ' '))
    return undefined
  }

  // authentication
  const verify = await verifySignature(event, rawBody).catch(err => {
    log.error('Error verifying signature: %s', err)
    log.debug(JSON.stringify(activity, null, ' '))
    return undefined
  })

  const proofVerify = activityData.proof && await verifyProof(activity as { proof: APProof, signature?: object })

  // authentication and authorization checks are done in each specific activity handler
  log.info(`Incoming AP activity from actor: %s, proof actor: %s`, verify?.actor?.ap_id ?? 'none', proofVerify?.actor?.ap_id ?? 'none')
  try {
    const ret = await handleActivity(activityData, verify, proofVerify)
    if (ret.status !== 'accepted') {
      log.warn('Skipping not accepted activity: %s', ret.reason)
      log.debug(JSON.stringify(activityData, null, ' '))
    } else {
      log.info('Activity accepted: %s', activityData.type)
    }
  } catch (error) {
    log.error('Error handling activity: %s', error)
    throw createError({ status: 500, message: 'Error handling activity' })
  }

  setResponseStatus(event, 202)
  setResponseHeader(event, 'Content-Type', 'application/activity+json')
})
