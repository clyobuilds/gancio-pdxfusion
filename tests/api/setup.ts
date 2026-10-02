// import { fetch, setup as nuxtSetup } from '@nuxt/test-utils/e2e'
import { connect, User } from '../../server/services/db'
import { $fetchRaw as fetch } from 'nitro-test-utils/e2e'
import { DateTime } from 'luxon'

export async function cleanDatabase(register = false) {
  const sequelize = await connect()
  try {
    await Promise.allSettled([
      sequelize.query(`DELETE FROM events`),
      sequelize.query('DELETE FROM ap_users'),
      sequelize.query('DELETE FROM events'),
      sequelize.query('DELETE FROM event_tags'),
      sequelize.query('DELETE FROM resources'),
      sequelize.query('DELETE FROM instances'),
      sequelize.query('DELETE FROM settings'),
      sequelize.query('DELETE FROM announcements'),
      sequelize.query('DELETE FROM oauth_tokens'),
      sequelize.query('DELETE FROM users'),
      sequelize.query('DELETE FROM tags'),
      sequelize.query('DELETE FROM places'),
      sequelize.query('DELETE FROM filters'),
      sequelize.query('DELETE FROM collections'),
      sequelize.query('DELETE FROM notifications'),
      sequelize.query('DELETE FROM tasks')
    ])
  } catch (e) {
    console.error(e)
  }
  if (register) {
    const adminUser = await User.create({
      email: 'admin',
      password: 'password',
      role: 'admin',
      is_active: true
    })
    const editorUser = await User.create({
      email: 'editor',
      password: 'password',
      role: 'editor',
      is_active: true
    })
    const userUser = await User.create({
      email: 'user',
      password: 'password',
      role: 'user',
      is_active: true
    })
    const anotherUser = await User.create({
      email: 'another',
      password: 'password',
      role: 'user',
      is_active: true
    })
    return { adminUser, editorUser, userUser, anotherUser }
  }
}

export function now() {
  return DateTime.now().toUnixInteger()
}

export const admin = JSON.stringify({ email: 'admin', password: 'password', grant_type: 'password', client_id: 'self' })
let cookie: string | null = ''
let token: string | null
// // let app
// // let places = []
// // let event_id: number

// // type AuthType = 'cookie' | 'jwt' | 'none'
export function setCookie(c: string | null) {
  cookie = c
}

export function setToken(t: string) {
  token = t
}

// export async function registerAdmin() {
//   const ret = await fetch('/api/user/register', {
//     method: 'POST',
//     headers: { 'content-type': 'application/json' },
//     body: admin
//   })
//   console.error(ret.status)
// }

export async function login() {
  const { headers } = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: admin
  })

  const cookie = headers.get('set-cookie')
  setCookie(cookie)
}

export async function fetchWithAuth(
  end_point: string, // : string,
  method = 'GET', // : string = 'GET',
  data?: any,
  authType = 'cookie', // : AuthType = 'cookie',
  contentType = 'application/json' // : 'application/json' | 'multipart/form-data' = 'application/json'
) {
  let headers: Record<string, string> = {} // : Record<string, string> = {}
  // let authHeader: string | undefined

  if (authType === 'cookie') {
    if (!cookie) {
      await login()
      if (!cookie) return
    }
    headers['cookie'] = cookie
  } else if (authType === 'jwt' && token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    headers = {}
  }

  let body // : string | undefined | FormData
  if (data !== undefined && method !== 'GET') {
    headers['Content-Type'] = contentType
    if (contentType === 'multipart/form-data') {
      body = new FormData()
      for (const key in data) {
        body.append(key, data[key])
      }
    } else {
      body = JSON.stringify(data)
    }
  }

  return fetch(end_point, {
    credentials: 'include',
    method,
    headers,
    body
  })
}
