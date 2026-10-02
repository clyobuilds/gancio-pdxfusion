import { sendEvent } from '../federation/events'
import { useLogger } from '../lib/logger'
import type { NotificationAction } from './db'
import { Event, Notification, Place, Tag, User } from './db'
import intersection from 'lodash.intersection'
import { publicSettings } from './settings'
import { enqueueMail } from './sendMail'
import emitter from '../lib/emitter'
import { mapEvent } from './events'

const log = useLogger('notifier')

/**
  * Send an email notification to admins and editors with the `to_notify` flag
  * @param {String} template The template to use to build the email (./server/emails/)
  * @param {Object} locals   Locals key/value object used in templates
  */
export async function notifyAdmins(template: string, locals: object) {
  const admins = await User.findAll({ where: { role: ['admin', 'editor'], is_active: true, to_notify: true }, attributes: ['email'], raw: true })
  let emails = [publicSettings.admin_email]
  emails = emails.concat(admins?.map(a => a.email))
  return enqueueMail(emails, template, locals)
}
export async function sendNotification(notification: Notification, event: Event) {
  log.info(`Send ${notification.type} notification ${notification.action}`)
  switch (notification.type) {
    // case 'mail': TODO: locale?
    //   return mail.send(notification.email, 'event', { event, notification })
    case 'admin_email':
      return notifyAdmins('event', { event, to_confirm: !event.is_visible, notification })
    case 'ap':
      if (!publicSettings.enable_federation) {
        log.info('Event not sent, federation is disabled')
        return
      }
      return sendEvent(event, notification.action)
  }
}

/**
 * Internal function to retrieve the list of notifications that should be sent for a given event and action.
 *
 * This function queries the Notification table for all notifications matching the specified action,
 * then filters them using the event's properties and the notification's filters (such as tags, places, and visibility).
 * Only notifications whose filters match the event are returned.
 *
 * @param {Event} event - The event for which notifications are being determined.
 * @param {NotificationAction} action - The action that triggered the notification (e.g., 'create', 'update').
 * @returns {Promise<Notification[]>} A promise that resolves to an array of matching Notification objects.
 * @todo filter by places
 * @internal
 */
export async function getNotifications(event: Event, action: NotificationAction): Promise<Notification[] | undefined> {
  log.debug(`getNotifications ${event.title} ${action}`)
  function match(event: Event, filters: Notification['filters']) {
    // matches if no filter specified
    if (!filters) {
      return true
    }

    // check for visibility
    if (typeof filters.is_visible !== 'undefined' && filters.is_visible !== event.is_visible) {
      return false
    }

    if (!filters.tags && !filters.places) {
      return true
    }
    if (!filters.tags?.length) {
      // if (!filters.tags?.length && !filters.places?.length) {
      return true
    }
    if (filters.tags?.length) {
      const m = intersection(event.tags?.map(t => t.tag), filters.tags)
      if (m.length > 0) {
        return true
      }
    }

    // if (filters.places?.length) {
    //   if (filters.places?.find(p => p === event.place?.name)) {
    //     return true
    //   }
    // }
  }

  const notifications = await Notification.findAll({ where: { action } })

  // get notification that matches with selected event
  return notifications.filter(notification => match(event, notification.filters))
}

/**
 * Notifies all relevant parties about an event based on the specified action.
 *
 * This function retrieves the event by its ID, determines which notifications are applicable
 * for the event and action, and sends those notifications. It logs warnings if the event does not exist,
 * and logs debug information about the notification process.
 *
 * @param action - The action that triggered the notification (e.g., 'create', 'update').
 * @param eventId - The ID of the event to notify about.
 * @returns A promise that resolves when all notifications have been processed.
 */
export async function notifyEvent(action: NotificationAction, eventId: number) {
  const event = await Event.findByPk(eventId, {
    include: [
      { model: Tag, attributes: ['tag'], through: { attributes: [] } },
      Place
    ],
    attributes: { exclude: ['placeId', 'media'] }
    // attributes: { exclude: ['userId', 'placeId', 'image_path', 'ap_object', 'ap_id', 'apUserApId', 'likes', 'boost'] },
  })

  if (!event) {
    log.warn('Notification for non-existent event')
    return
  }

  // emit this notification to plugins
  emitter.emit(`event:${action}`, mapEvent(event))
  log.debug('[NOTIFY] %s, %s [%d]', action, event.title, event.id)

  // select valid notification for this event
  const notifications = await getNotifications(event, action)
  if (!notifications) return
  const promises = notifications?.map(async (notification: Notification) => {
    // const event_notification = await EventNotification.create({ eventId: event.id, notificationId: notification.id, status: 'sending' })
    try {
      return sendNotification(notification, event)
      // await event_notification.update({ status: 'sent' })
    } catch (e) {
      log.error('[NOTIFY EVENT]', e)
      // await event_notification.update({ status: 'error', error: String(e) })
    }
  })

  return Promise.allSettled(promises)
}

// export async function notify () {
//   // get all event notification in queue
//   const eventNotifications = await EventNotification.findAll({ where: { status: 'new' } })
//   const promises = eventNotifications.map(async e => {
//     const event = await Event.findByPk(e.eventId, { include: [User, Place, Tag] })
//     if (!event.place) { return }
//     const notification = await Notification.findByPk(e.notificationId)
//     try {
//       await notifier.sendNotification(notification, event)
//       e.status = 'sent'
//       return e.save()
//     } catch (err) {
//       log.error('[NOTIFY]', err)
//       e.status = 'error'
//       e.error = err
//       return e.save()
//     }
//   })
//   return Promise.all(promises)
// }

// const events = require('events')
// const mail = require('./api/mail')
// const log = require('./log')
// const fediverseHelpers = require('./federation/helpers')

// const { Event, Notification, EventNotification, User, Place, Tag } = require('./api/models/models')

// // const settingsController = require('./api/controller/settings')

// const notifier = {

//   emitter: new events.EventEmitter(),
//   async sendNotification (notification, event) {
//     const promises = []
//     log.info(`Send ${notification.type} notification ${notification.action}`)
//     let p
//     switch (notification.type) {
//       // case 'mail': TODO: locale?
//       //   return mail.send(notification.email, 'event', { event, notification })
//       case 'admin_email':
//         p = notifier.notifyAdmins('event', { event, to_confirm: !event.is_visible, notification })
//         promises.push(p)
//         break
//       case 'ap':
//         p = fediverseHelpers.sendEvent(event, notification.action)
//         promises.push(p)
//     }
//     return Promise.all(promises)
//   },

//   async getNotifications(event, action) {
//     log.debug(`getNotifications ${event.title} ${action}`)
//     function match(event, filters) {
//       // matches if no filter specified
//       if (!filters) { return true }

//       // check for visibility
//       if (typeof filters.is_visible !== 'undefined' && filters.is_visible !== event.is_visible) { return false }

//       if (!filters.tags && !filters.places) { return true }
//       if (!filters.tags.length && !filters.places.length) { return true }
//       if (filters.tags.length) {
//         const m = intersection(event.tags.map(t => t.tag), filters.tags)
//         if (m.length > 0) { return true }
//       }
//       if (filters.places.length) {
//         if (filters.places.find(p => p === event.place.name)) {
//           return true
//         }
//       }
//     }

//     const notifications = await Notification.findAll({ where: { action }})

//     // get notification that matches with selected event
//     return notifications.filter(notification => match(event, notification.filters))
//   },

//   async notifyEvent (action, eventId) {

//     const event = await Event.findByPk(eventId, { include: [ { model: Tag, attributes: ['tag'], through: { attributes: [] }}, Place],
//       attributes: { exclude: ['userId', 'placeId', 'image_path', 'ap_object', 'ap_id', 'apUserApId', 'likes', 'boost'] } })

//     // emit this notification to plugins
//     notifier.emitter.emit(action, event.get({ plain: true, raw: true }))
//     log.debug('[NOTIFY] %s, %s [%d]', action, event.title, event.id)

//     // select valid notification for this event
//     const notifications = await notifier.getNotifications(event, action)

//     const promises = notifications.map(async notification => {
//       const event_notification = await EventNotification.create({ eventId: event.id, notificationId: notification.id, status: 'sending' })
//       try {
//         await notifier.sendNotification(notification, event)
//         await event_notification.update({ status: 'sent' })
//       } catch (e) {
//         log.error('[NOTIFY EVENT]', e)
//         await event_notification.update({ status: 'error', error: String(e) })
//       }
//     })

//     return Promise.all(promises)
//   },

//   async  notify () {
//     // get all event notification in queue
//     const eventNotifications = await EventNotification.findAll({ where: { status: 'new' } })
//     const promises = eventNotifications.map(async e => {
//       const event = await Event.findByPk(e.eventId, { include: [User, Place, Tag] })
//       if (!event.place) { return }
//       const notification = await Notification.findByPk(e.notificationId)
//       try {
//         await notifier.sendNotification(notification, event)
//         e.status = 'sent'
//         return e.save()
//       } catch (err) {
//         log.error('[NOTIFY]', err)
//         e.status = 'error'
//         e.error = err
//         return e.save()
//       }
//     })
//     return Promise.all(promises)
//   }
// }

// module.exports = notifier
