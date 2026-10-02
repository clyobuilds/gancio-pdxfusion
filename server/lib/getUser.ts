import { type H3Event, clearResponseHeaders } from 'h3'
import { User } from '../services/db'
import { getUserSession, getLegacyUserSession, type UserSession, getBearerUserSession } from './session'

/**
 * Get the user of the request based on:
 * - `nuxt-session` cookie (created by the login endpoint)
 * - OAuth Bearer token (created by legacy gancio code)
 * - JWT Bearer token issued via /api/login/token
 * - @todo: implement oauth2
 * @todo
 */
export async function getUser(event: H3Event) {
  let user: UserSession | undefined = await getUserSession(event)

  if (!user) {
    user = await getBearerUserSession(event)
  }

  if (!user) {
    user = await getLegacyUserSession(event)
  }

  if (!user) {
    // FIX:
    // ref: https://github.com/orgs/h3js/discussions/1250
    clearResponseHeaders(event, ['set-cookie'])
    return
  }

  // check if user exists and is enabled
  return User.findByPk(user.id, { where: { is_active: true }, attributes: ['id', 'email', 'role'], raw: true })
    .then(u => u || undefined)
    .catch((err) => {
      console.warn('Error finding user by id:', err)
      return undefined
    })
}