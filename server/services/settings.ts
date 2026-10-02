import { z } from 'zod'
import { promisify } from 'util'
import crypto from 'crypto'
import { get as getConfig } from './config'
import type { SecretSettings, Settings } from '~~/shared/types/settings'
import { useLogger } from '../lib/logger'
import { Setting } from './db'
import emitter from '../lib/emitter'

const generateKeyPair = promisify(crypto.generateKeyPair)

export const settingSchema = z.object({
  key: z.string(),
  is_secret: z.boolean().default(false),
  value: z.union([z.string(), z.boolean()])
})
const config = getConfig()
export type SettingType = z.infer<typeof settingSchema>

export const publicSettingsLastModified: Partial<Record<keyof Settings, Date>> = {}

export const publicSettings: Settings = {
  'title': config?.title || 'Gancio',
  'description': config?.description || 'A shared agenda for local communities',
  'baseurl': config.baseurl || '',
  'hostname': new URL(config.baseurl).hostname,
  'instance_timezone': 'Europe/Rome',
  'instance_locale': 'en',
  'instance_name': 'relay',
  'allow_registration': true,
  'allow_anon_event': true,
  'allow_multidate_event': true,
  'allow_recurrent_event': false,
  'allow_event_without_end_time': true,
  'open_ended_event_default_duration': 3,
  'allow_online_event': true,
  'show_download_media': true,
  'enable_moderation': false,
  'enable_report': false,
  'recurrent_event_visible': false,
  'allow_geolocation': false,
  'geocoding_provider_type': 'Nominatim',
  'geocoding_provider': 'https://nominatim.openstreetmap.org/search',
  'geocoding_countrycodes': [],
  'tilelayer_provider': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'tilelayer_provider_attribution': '<a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  'enable_federation': true,
  'enable_federation_quoting': true,
  'federated_events_in_home': true,
  'enable_resources': false,
  'hide_boosts': true,
  'theme.is_dark': true,
  'dark_colors': { primary: '#FF6E40', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FB8C00' },
  'light_colors': { primary: '#FF4500', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FB8C00' },
  'hide_thumbs': false,
  'hide_calendar': false,
  'footerLinks': [
    { href: '/', label: 'common.home' },
    { href: '/about', label: 'common.about' }
  ],
  'plugins': [],
  'default_fedi_hashtags': [],
  'custom_js': '',
  'custom_css': '',
  'admin_email': config.admin_email ?? '',
  'smtp': config.smtp ?? {},
  'status': 'loading'
}

export const secretSettings: SecretSettings = {
  privateKey: ''
}

export function getSetting(key: keyof Settings) {
  return publicSettings[key]
}
export async function getSettings() {
  return Setting.findAll({ raw: true })
}

type AllSettings = Settings & SecretSettings

export async function setSetting<K extends keyof AllSettings>(
  key: K,
  value: AllSettings[K],
  is_secret: boolean = false
): Promise<[entity: Setting, created: boolean | null]> {
  const log = useLogger('settings')
  log.info(`SET '${key}' -> '${is_secret ? '<HIDDEN FROM LOG>' : value}'`)
  if (is_secret) {
    secretSettings[key] = value
  } else {
    publicSettings[key] = value
    emitter.emit('settings:updated', { key, value })
  }
  const setting = await Setting.upsert({ key, value, is_secret })
  if (!is_secret) {
    publicSettingsLastModified[key] = setting[0].updatedAt
  }
  return setting
}

export async function loadSettings() {
  const settings = await Setting.findAll()
  for (const setting of settings) {
    if (setting.is_secret) {
      secretSettings[setting.key] = setting.value
    } else {
      publicSettings[setting.key] = setting.value
      publicSettingsLastModified[setting.key] = setting.updatedAt
    }
  }

  // add pub/priv instance key if needed
  if (!publicSettings.publicKey) {
    // log.info('Instance priv/pub key not found, generating....')
    const { publicKey, privateKey } = await generateKeyPair('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })
    await setSetting('publicKey', publicKey)
    await setSetting('privateKey', privateKey, true)
  }
  return publicSettings
}
