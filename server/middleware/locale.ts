import { defineEventHandler, getCookie, getHeader } from 'h3'
import { publicSettings } from '../services'

export default defineEventHandler(async (event) => {
  const cookieLocale = getCookie(event, 'i18n_redirected')
  const headerLocale = getHeader(event, 'accept-language')?.split(',')[0]
  event.context.locale = cookieLocale || headerLocale || publicSettings.instance_locale || 'en'
})