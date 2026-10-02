import { defineEventHandler, getRouterParam, createError } from 'h3'
import { handleCache } from '~~/server/lib/API'
import { isRole } from '~~/server/lib/auth'
import { publicSettings, publicSettingsLastModified } from '~~/server/services'
import type { Settings } from '~~/shared/types/settings'

/**
 * @openapi
 * /api/settings/{key}:
 *   get:
 *     summary: Get setting value
 *     description: >
 *       Get setting by key. If role is not admin, only the following settings are available to get:
 *       `title`, `description`, `logo`, `baseurl`, `instance_name`, `hostname`, `about`, `allow_registration`,
 *       `allow_anon_event`, `allow_multidate_event`, `allow_recurrent_event`, `allow_event_without_end_time`,
 *       `allow_online_event`, `show_download_media`, `enable_moderation`, `enable_report`, `enable_federation`,
 *       `enable_resources`, `recurrent_event_visible`, `hide_calendar`, `allow_geolocation`, `hide_thumbs`,
 *       `hide_boosts`.
 *     parameters:
 *       - name: key
 *         in: path
 *         description: Setting key.
 *         required: true
 *         example: title
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Setting value.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: Demo Gancio
 *       404:
 *         description: Cannot access this setting.
 *     tags:
 *       - Settings
 */
export default defineEventHandler(async (evt) => {
  const allowed_settings: Array<keyof Settings> = ['title', 'description', 'logo', 'baseurl', 'instance_name', 'hostname', 'about',
    'allow_registration', 'allow_anon_event', 'allow_multidate_event', 'allow_recurrent_event', 'allow_event_without_end_time',
    'allow_online_event', 'show_download_media', 'enable_moderation', 'enable_report', 'enable_federation',
    'enable_resources', 'recurrent_event_visible', 'hide_calendar', 'allow_geolocation', 'hide_thumbs', 'hide_boosts']

  const key = getRouterParam(evt, 'key') as keyof Settings
  if (key && typeof publicSettings[key] != 'undefined' && (allowed_settings.includes(key) || await isRole(evt, 'admin'))) {
    if (await handleCache(evt, publicSettingsLastModified[key])) return
    return publicSettings[key]
  } else {
    throw createError({ statusCode: 404, message: 'Cannot access this setting' })
  }
})