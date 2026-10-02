import { Op } from '@sequelize/core'
import { DateTime } from 'luxon'
import { useLogger } from '../lib/logger'
import { APUser, Resource, Event } from '../services/db'

const log = useLogger('tags')

/**
 * Removes past federated events and their related resources.
 * This is called twice a day from the TaskManager
 */
export async function cleanPastEvents() {
  const now = DateTime.now().toUnixInteger()
  const events = await Event.findAll({
    where: {
      start_datetime: { [Op.lt]: now },
      apUserApId: { [Op.ne]: null }
    }, raw: true
  })

  if (!events.length) {
    return
  }

  log.info(`[AP] Remove ${events.length} past federated events and related resources`)
  const eventsId = events.map(e => e.id)

  // remove related resources..
  await Resource.destroy({ where: { eventId: eventsId } })

  // TODO: remove related img?

  // ...and notiifcations
  // TODO
  // await EventNotification.destroy({ where: { eventId: eventsId }})

  await Event.destroy({ where: { id: eventsId } }).catch((e) => {
    log.debug('[AP] Error while removing past federated events: %s', JSON.stringify(e))
  })
}

/**
 * Removes unused ActivityPub actors from the database.
 * This is called once a day from the TaskManager
 */
export async function cleanUnusedAPActor() {
  const ap_users = await APUser.findAll({
    limit: 500,
    where: {
      follower: { [Op.not]: true },
      following: { [Op.not]: true },
      trusted: { [Op.not]: true },
      blocked: { [Op.not]: true }
    },
    include: [
      { model: Event, required: false },
      { model: Resource, required: false }
    ],
    raw: true
  })

  const ap_ids = ap_users.filter(a => a['events.id'] === null && a['resources.id'] === null).map(a => a.ap_id)
  if (ap_ids.length) {
    log.debug('[AP] Remove %d not used federated actors', ap_ids.length)
    await APUser.destroy({ where: { ap_id: ap_ids } })
  }
}
