import { defineEventHandler, getRouterParams, setHeader, createError } from 'h3'
import { useLogger } from '~~/server/lib/logger'
import { publicSettings } from '~~/server/services'

export default defineEventHandler(async (evt) => {
  if (!publicSettings.enable_federation || !publicSettings.enable_federation_quoting) {
    throw createError({ statusCode: 404, message: 'Federation quoting is not enabled' })
  }

  const log = useLogger('Quote Auth')
  setHeader(evt, 'Content-Type', 'application/activity+json')

  // extract eventId and actorId from stamp
  const { stamp } = getRouterParams(evt)
  if (!stamp) {
    throw createError({ statusCode: 400, message: 'stamp is required' })
  }

  try {
    const { eventId, quoterPostId } = JSON.parse(Buffer.from(stamp, 'base64url').toString())
    log.debug(`eventId: ${eventId}, quoterPostId: ${quoterPostId}`)

    return {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        {
          gts: 'https://gotosocial.org/ns#',
          QuoteAuthorization: 'https://w3id.org/fep/044f#QuoteAuthorization',
          interactingObject: 'gts:interactingObject',
          interactionTarget: 'gts:interactionTarget'
        }
      ],
      'id': `https://${publicSettings.baseurl}/federation/q/${stamp}`,
      'type': 'QuoteAuthorization',
      'attributedTo': `${publicSettings.baseurl}/federation/u/${publicSettings.instance_name}`,
      'interactingObject': quoterPostId,
      'interactionTarget': eventId
    }
  } catch {
    log.error('Failed to parse stamp', stamp)
    throw createError({ statusCode: 500, message: 'Failed to parse stamp' })
  }
})
