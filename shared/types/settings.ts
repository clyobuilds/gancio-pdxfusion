export type FooterLink = { label: string, href: string, to?: string }
export type FooterLinks = FooterLink[]

export enum Statuses {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export type PluginSettings = {
  enable?: boolean
} & Record<string, unknown>

export type Settings = {
  'title': string
  'description': string
  /** the path to the logo image for the instance */
  'logo'?: string
  'header_image'?: string
  'fallback_image'?: string
  'baseurl': string
  'hostname': string
  'instance_timezone': string
  'instance_locale': string
  'instance_name': string
  'allow_registration': boolean
  'allow_anon_event': boolean
  'allow_multidate_event': boolean
  'allow_recurrent_event': boolean
  'allow_event_without_end_time': boolean
  /** in hour */
  'open_ended_event_default_duration': number
  'allow_online_event': boolean
  'show_download_media': boolean
  'enable_moderation': boolean
  'enable_report': boolean
  'recurrent_event_visible': boolean
  'allow_geolocation': boolean
  'geocoding_provider_type': string
  'geocoding_provider': string
  'geocoding_countrycodes': Array<string>
  'tilelayer_provider': string
  'tilelayer_provider_attribution': string
  'enable_federation': boolean
  'federated_events_in_home': boolean
  'enable_federation_quoting': boolean
  'enable_resources': boolean
  'hide_boosts': boolean
  'theme.is_dark': boolean
  'dark_colors': ThemeColorPalette
  'light_colors': ThemeColorPalette
  'hide_thumbs': boolean
  'hide_calendar': boolean
  'footerLinks': Array<FooterLink>
  'plugins': Array<object>
  'admin_email': string
  'smtp'?: SmtpSettings
  'collection_in_home'?: string
  'calendar_first_day_of_week'?: number
  'default_fedi_hashtags': Array<string>
  'custom_js': string
  'custom_css': string
  'publicKey'?: string
  'about'?: string
  'trusted_sources_label'?: string
  'status': 'loading' | 'ready'
} & PluginSettings

export interface SmtpSettings {
  port?: number
  host?: string
  secure?: boolean
  requireTLS?: boolean
  auth?: { user?: string, pass?: string }
  from?: string
  sendmail?: boolean
}

// { primary: '#FF6E40', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FB8C00' },
export type ThemeColorPalette = { [key: string]: string }

export type SecretSettings = {
  privateKey: string
  recurrent_notified_until?: number
}
