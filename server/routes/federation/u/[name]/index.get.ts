// import { APUser } from "~/server/utils/sequelize"
import { defineEventHandler, sendRedirect, getRouterParam, setHeader, createError } from 'h3'
import { applicationActorId } from '~~/server/federation/helpers'
import { useLogger } from '~~/server/lib/logger'
import { preferHTML } from '~~/server/lib/negotiator'
import { publicSettings } from '~~/server/services'

export default defineEventHandler(async (event) => {
  const log = useLogger('federation actor')
  if (preferHTML(event)) {
    log.debug('Get actor but prefer text/html, redirect to homepage')
    return sendRedirect(event, '/', 302)
  }

  const name = getRouterParam(event, 'name')
  if (!name) {
    log.warn(`[FEDI] Bad request`)
    throw createError({ status: 400, message: 'Bad request' })
  }

  if (name !== publicSettings.instance_name) {
    log.debug(`Get unknown actor ${name} (should be ${publicSettings.instance_name})`)
    throw createError({
      status: 404,
      message: `No record found for ${name} (are you searching for ${publicSettings.instance_name} ?)`
    })
  }

  setHeader(event, 'Content-Type', 'application/activity+json; charset=utf-8')

  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1',
      {
        toot: 'http://joinmastodon.org/ns#',

        // A property-value pair, e.g. representing a feature of a product or place. We use this to publish this very same instance
        // https://docs.joinmastodon.org/spec/activitypub/#PropertyValue
        schema: 'http://schema.org#',
        PropertyValue: 'schema:PropertyValue',
        value: 'schema:value',

        // https://docs.joinmastodon.org/spec/activitypub/#discoverable
        discoverable: 'toot:discoverable',

        indexable: 'toot:indexable'
      }
    ],
    'id': applicationActorId,
    'type': 'Application',
    'summary': publicSettings.description,
    'name': publicSettings.title,
    'preferredUsername': name,
    'inbox': `${applicationActorId}/inbox`,
    'outbox': `${applicationActorId}/outbox`,
    'manuallyApprovesFollowers': false,
    'upcomingEvents': `${applicationActorId}/events`,
    'endpoints': { sharedInbox: `${applicationActorId}/inbox` },
    'discoverable': true,
    'indexable': true,
    'attachment': [
      {
        type: 'PropertyValue',
        name: 'Website',
        value: `<a href='${publicSettings.baseurl}'>${publicSettings.baseurl}</a>`
      }
    ],
    'icon': {
      type: 'Image',
      mediaType: 'image/png',
      url: publicSettings.baseurl + '/logo.png'
    },
    'image': {
      type: 'Image',
      mediaType: 'image/png',
      url: publicSettings.baseurl + '/headerimage.png'
    },
    'publicKey': {
      id: `${applicationActorId}#main-key`,
      owner: applicationActorId,
      publicKeyPem: publicSettings.publicKey
    },
    'url': applicationActorId
  }
})
