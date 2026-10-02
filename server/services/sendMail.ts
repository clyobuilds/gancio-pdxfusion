import Email from 'email-templates'
import { DateTime } from 'luxon'
import locales from '../i18n/locales'
import { useLogger } from '../lib/logger'
import { publicSettings } from './settings'
import { useTaskManager } from './taskManager'
import { runtimeResolve } from './config'
const log = useLogger('mail')

/**
 * Enqueues an email to be sent using the task manager.
 *
 * @param addresses - The recipient email address or an array of addresses.
 * @param template - The name of the email template to use.
 * @param locals - Optional. Local variables to pass to the email template.
 * @param locale - Optional. The locale/language to use for the email.
 * @param bcc - Optional. If true, sends the email as BCC instead of TO.
 */
export function enqueueMail(addresses: string | string[], template: string, locals?: object, locale?: string, bcc?: boolean) {
  locale = locale ?? publicSettings.instance_locale
  if (process.env.NODE_ENV === 'production' && (!publicSettings.admin_email || !publicSettings.smtp)) {
    log.error(`Cannot send any email: SMTP Email configuration not completed!`)
    return
  }

  log.debug(`Enqueue new email ${template} ${locale}`)
  useTaskManager().add({
    name: 'MAIL',
    method: sendMail,
    args: [addresses, template, locals, locale, bcc]
  })
}

type emailTemplates = 'register' | 'confirm' | 'user_confirm' | 'recover' | 'admin_register' | 'event_confirm' | 'test'
export async function sendMail(addresses: string | string[], template: emailTemplates, locals?: object, locale?: string, bcc?: boolean) {
  // this hack is needed because there are more standards to indicate language code
  // https://framagit.org/les/gancio/-/issues/539#note_2198016
  const localeMapOverride = {
    'sr-Cyrl': 'Cy-sr-SP',
    'sr-Latn': 'Lt-sr-SP'
  }
  const settings = publicSettings
  locale = locale ?? settings.instance_locale
  locale = localeMapOverride?.[locale] ?? locale
  log.info(`Send ${template} email to ${addresses} with locale ${locale}`)

  const from = `"${settings?.smtp?.from || '📅 ' + settings.title}" <${settings.admin_email}>`
  const email = new Email({
    views: {
      root: runtimeResolve('./static/emails')
    },
    preview: true,
    htmlToText: {},
    juice: true,
    juiceResources: {
      preserveImportant: true,
      webResources: {
        relativeTo: runtimeResolve('./static/emails')
      }
    },
    message: {
      from
    },
    send: true,
    i18n: {
      // TODO: support custom locale (ref: https://github.com/mashpie/i18n-node/issues/423 )
      directory: runtimeResolve('../i18n/locales/email'),
      objectNotation: true,
      syncFiles: false,
      retryInDefaultLocale: true,
      updateFiles: false,
      defaultLocale: 'en',
      locale,
      locales: Object.keys(locales).map(l => localeMapOverride?.[l] ?? l)
    },

    transport: settings.smtp // || {}
  })

  const opt = {
    zone: settings.instance_timezone,
    locale
  }

  const msg = {
    template,
    message: {
      [bcc ? 'bcc' : 'to']: addresses
    },
    locals: {
      ...locals,
      locale,
      config: { title: settings.title, baseurl: settings.baseurl, description: settings.description, admin_email: settings.admin_email },
      datetime: (timestamp: number) => DateTime.fromSeconds(timestamp, opt).toFormat('EEEE, d MMMM HH:mm')
    }
  }
  return email.send(msg)
    .catch((e) => {
      log.error('[MAIL]', e)
      throw e
    })
}
