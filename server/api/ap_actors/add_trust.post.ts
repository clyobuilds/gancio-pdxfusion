import { defineEventHandler, readValidatedBody, createError } from 'h3'
import { z } from 'zod'
import { followActor } from '~~/server/federation/helpers'
import { getInstance } from '~~/server/federation/lookup'
import { getActor } from '~~/server/federation/get_actor'
import { get as getConfig } from '../../services/config'
import { isHiddenService } from '../../helpers'
import { useLogger } from '~~/server/lib/logger'
import type { Instance } from '~~/server/services'
import { requireAdmin } from '~~/server/lib/auth'

const schema = z.object({
  url: z.string()
})

/**
 * @openapi
 * /api/ap_actors/add_trust:
 *   post:
 *     summary: Trust
 *     description: Trust an AP actor by URL. Admin role is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: AP URL. In case we have a @ we should use webfinger, in case we have a full url could be an actor or a nodeinfo url to search for.
 *                 example: https://ap_domain.org
 *     responses:
 *       200:
 *         description: The updated AP actor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APUser'
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Hidden service not allowed.
 *       404:
 *         description: No actor found or no self links in webfinger or wrong webfinger response or error adding trusted actor.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - AP Actors
 */
export default defineEventHandler(async (event) => {
  const config = getConfig()

  // authenticate
  await requireAdmin(event)

  const log = useLogger('add trust')
  const body = await readValidatedBody(event, schema.parse)

  let url = body.url.trim()
  let instance: Instance | undefined

  // @actor@instance.tld | actor@instance.tld syntax, let's use webfinger
  if (!url.startsWith('http') && url.includes('@')) {
    const [user, instance_url] = url.replace(/^@/, '').split('@')
    log.debug('Adds user: %s and instance: %s because url was: %s', user, instance_url, url)
    try {
      let protocol = 'https://'
      if (config.hidden_service === 'true' && isHiddenService(url)) {
        protocol = 'http://'
      }

      if (config.hidden_service !== 'true' && isHiddenService(url)) {
        log.warn('Trying to trust instance %s but hidden services are not enabled', instance_url)
        throw createError({ status: 403, message: 'Hidden service not allowed' })
      }

      const webfinger = await $fetch<{ links: { rel: string, href: string }[] }>(`${protocol}${instance_url}/.well-known/webfinger?resource=acct:${user}@${instance_url}`)
      if (webfinger && Array.isArray(webfinger?.links)) {
        const actor_url = webfinger.links.find(l => l.rel === 'self')
        if (!actor_url) {
          log.warn('Cannot found `self` links in webfinger of %s', url)
          throw createError({ status: 404, message: 'No self links in webfinger' })
        }

        log.info(`Adding trusted instance ${instance_url} and actor ${actor_url.href}...`)
        const actor = await getActor(actor_url.href, true)
        if (!actor) {
          log.warn('Cannot found actor %s', actor_url.href)
          throw createError({ status: 404, message: 'No actor found' })
        }
        log.debug('Actor %s', actor.ap_id)
        await actor.update({ trusted: true })
        return actor
      }
    } catch (e) {
      log.error('Wrong webfinger response from %s: %s ', url, e?.response?.data ?? String(e))
      throw createError({ status: 404, message: 'Wrong webfinger response' })
    }
  }

  try {
    // this could be an actor
    if (!url.startsWith('http')) {
      url = `https://${url}`
    }
    url = url.replace(/\/$/, '')

    log.info(`Adding trusted instance ${url} ...`)
    instance = await getInstance(url, true)
    if (!instance) {
      throw createError({ status: 404, message: 'No instance' })
    }

    let actor
    // should we try to use URL as actor? to review
    try {
      log.debug('Trying to use %s as actor', url)
      actor = await getActor(url)
      if (actor) {
        log.debug('Actor %s', actor.ap_id)
        await actor.update({ trusted: true })
        await followActor(actor)
        return actor
      } else {
        log.error('not an actor? ')
      }
    } catch (e) {
      log.debug('%s is probably not an actor: %s', url, String(e))
    }

    // ok this wasn't an actor, let's use the applicationActor if exists
    if (!actor && instance?.applicationActor) {
      log.debug('This node supports FEP-2677 and applicationActor is: %s', instance.applicationActor)
      actor = await getActor(instance.applicationActor, true)
      if (!actor) {
        log.debug('applicationActor %s is probably not an actor', instance.applicationActor)
        throw createError({ status: 404, message: 'Actor not found' })
      }
      log.debug('Actor %s', actor.ap_id)
      await actor.update({ trusted: true })
      return actor
    }

    // supports old gancio / mobilizon instances default actor
    // if (instance?.data?.software?.name === 'Mobilizon') {
    //   instance.actor = 'relay'
    // } else if (instance?.data?.software?.name === 'gancio') {
    //   instance.actor = instance?.data?.metadata?.nodeActor' ?? 'relay'
    // }
    log.debug(`instance .well-known: ${instance.name} - ${instance.domain}`)

    // if we have an actor, let's make a new friend
    if (instance.actor) {
      // send a well-known request
      const instance_hostname = new URL(url).host
      const webfinger = await $fetch(`${url}/.well-known/webfinger?resource=acct:${instance.actor}@${instance_hostname}`)
      if (!webfinger?.links) {
        throw createError({ status: 404, message: 'No links in webfinger' })
      }

      // search for actor url
      const actorURL = webfinger?.links.find(l => l.rel === 'self').href

      // retrieve the AP actor and flag it as trusted
      const actor = await getActor(actorURL, true)
      await actor.update({ trusted: true })
      return actor
    }
    throw createError({ statusCode: 404, statusMessage: 'No way' })
  } catch (e) {
    console.error(e)
    log.error('Error adding trusted actor %s', e?.response?.data ?? String(e))
    throw createError({ status: 404, statusText: 'Error adding trusted actor' })
  }
})
