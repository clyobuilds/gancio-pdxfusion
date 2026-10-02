import { type H3Event, useSession, type SessionConfig, getCookie, getHeader, createError } from 'h3'
import { OAuthToken, User, type UserRole } from '../services/db'
import { isBuild } from '../services/config'
import { verifyJwtToken } from './jwt'

export type UserSession = { id: number, email: string, role: UserRole }

const sessionOptions: SessionConfig = {
  maxAge: 60 * 60 * 24 * 365,
  name: 'nuxt-session',
  password: process.env.SESSION_PASSWORD!,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isBuild
  }
}

export async function setUserSession(event: H3Event, user: UserSession) {
  const session = await useSession(event, sessionOptions)
  await session.update({ user: { id: user.id, email: user.email, role: user.role } })
  return session.data
}

export async function getUserSession(event: H3Event) {
  const cookie = getCookie(event, 'nuxt-session')
  if (!cookie) return
  const session = await useSession(event, sessionOptions)
  return session.data?.user
}

export async function clearUserSession(event: H3Event) {
  const session = await useSession(event, sessionOptions)
  await session.clear()
}

export async function getBearerUserSession(event: H3Event) {
  const tokenBearer = getHeader(event, 'authorization')
  if (!tokenBearer) return
  const token = tokenBearer?.split(' ')?.[1]
  if (!token) return
  return verifyJwtToken(token).catch(() => {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  })
}

export async function getLegacyUserSession(event: H3Event) {
  // in gancio legacy code, we store tokens inside oauth_tokens table, so we can check if the token is valid and get the user id from there
  // this is not the best way to do it, but it allows us to keep using the same tokens for a while without breaking existing clients
  const tokenCookie = getCookie(event, 'auth._token.local')
  if (!tokenCookie) return
  const accessToken = tokenCookie?.split(' ')?.[1]
  if (!accessToken) return
  const token = await OAuthToken.findByPk(accessToken, {
    include: [{
      required: true, where: { is_active: true },
      model: User, attributes: { exclude: ['password'] }
    }]
  })

  // if token is valid and active, issue a new session
  if (token && token.user && token.user.is_active) {
    await setUserSession(event, token.user)
    return token.user
  }
}
