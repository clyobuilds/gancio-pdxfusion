import type { GancioContext, GancioPlugin } from '../../server/services/plugins'
import type { EventAPI } from '../../shared/types/generic'
import type { PluginSettings } from '../../shared/types/settings'

type Action = 'CREATE' | 'UPDATE' | 'DELETE'

export default ({ log }: GancioContext): GancioPlugin => ({
  manifest: {
    name: 'Webhook',
    author: 'lesion',
    url: 'https://framagit.org/les/gancio',
    description: 'Send an HTTP POST / webhook to specified endpoint with event creation/update/deletion',
    version: '2.0',
    settings: {
      token: {
        type: 'TEXT',
        description: 'Authorization token',
        required: true,
        hint: 'Your webhook Bearer token for the Authorization header.'
      },
      endpoint: {
        type: 'URL',
        description: 'HTTP endpoint',
        required: true,
        hint: 'The <strong>HTTP URL</strong> that will receive the webhook call.'
      }
    }
  },

  load() {
    log.info('Webhook plugin loaded!')
  },

  async onTest(testSettings) {
    log.debug(`[WEBHOOK Plugin] Sending test event`)
    const testEvent = {
      id: 255, title: 'Test Event',
      slug: 'test-6', description: '<p>This is the event description</p>',
      multidate: false, start_datetime: 1719356700,
      end_datetime: null,
      media: [{ url: '2bd078842958ffac3815cb994b20e9ff.jpg', height: 795, width: 800, name: 'Test Event', size: 139385, focalpoint: [0, 0] }],
      is_visible: true, recurrent: null, online_locations: ['https://gancio.org'],
      createdAt: '2024-06-26T09:30:52.638Z', updatedAt: '2024-06-26T09:48:50.249Z', placeId: 326,
      tags: [{ tag: 'tag' }],
      place: {
        id: 326, name: 'Theaterplatz  63739 Aschaffenburg', address: 'Oberstadt, Stadtmitte, Aschaffenburg, Bayern, 63739, Deutschland',
        latitude: 57.1758333, longitude: 26.8738889 }
    }
    await this._send(testEvent, 'CREATE', testSettings)
  },

  onEventCreate(event) {
    log.debug(`[WEBHOOK Plugin] Event "${event.title}" created`)
    this._send(event, 'CREATE')
  },

  onEventUpdate(event) {
    log.info(`[WEBHOOK Plugin] Event "${event.title}" updated`)
    this._send(event, 'UPDATE')
  },

  onEventDelete(event) {
    log.info(`[WEBHOOK Plugin] Event "${event.title}" deleted`)
    this._send(event, 'DELETE')
  },

  async _send (event: EventAPI, action: Action, withSettings?: PluginSettings) {
    const settings = withSettings ?? this.settings
    try {
      const response = await fetch(settings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.token}`
        },
        body: JSON.stringify({
          action,
          event
        })
      })
      if (response.ok) {
        log.info('[WEBHOOK Plugin] %s', response)
      } else {
        throw new Error(`Response returned status = ${response.status}`)
      }
    } catch (err) {
      log.error('[WEBHOOK Plugin] %s', err)
      throw err
    }
  }
})
