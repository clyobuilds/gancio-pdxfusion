import { $fetchRaw as $fetch } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { cleanDatabase } from './setup'

const admin = JSON.stringify({ email: 'admin', password: 'password' })
const wrong_credentials = JSON.stringify({ email: 'admin', password: 'wrong' })

let cookie: string | null
let token: string | null

describe('Authentication / Authorization', async () => {
  await cleanDatabase()
  it('should not return an user when not authenticated', async () => {
    const { status } = await $fetch('/api/user', { headers: { cookie: '' } })
    expect(status).toBe(401)
  })

  it('should not authenticate with wrong user/password', async () => {
    const { status } = await $fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin', password: 'wrong' })
    })

    expect(status).toBe(401)
  })

  it('should register an admin as first user', async () => {
    const { status, data: user } = await $fetch('/api/user/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: admin
    })

    expect(status).toBe(200)
    expect(user?.id).toBeDefined()
  })

  it('should authenticate with correct user/password', async () => {
    const { status, headers } = await $fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: admin
    })

    expect(status).toBe(200)
    cookie = headers.get('set-cookie')
    expect(cookie).toContain('nuxt-session=')
  })

  it('should get user when authenticated via cookie', async () => {
    const { status, data: user } = await $fetch('/api/user', { headers: { cookie: cookie! } })
    expect(status).toBe(200)
    expect(user?.email).toBe('admin')
  })

  it('should not authenticate with wrong user/password', async () => {
    const { status } = await $fetch('/api/login/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: wrong_credentials
    })

    expect(status).toBe(401)
  })

  it('should authenticate with correct user/password and get JWT token', async () => {
    const { status, data } = await $fetch('/api/login/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: admin
    })

    expect(status).toBe(200)
    expect(data?.access_token).toBeDefined()
    expect(typeof data.access_token).toBe('string')
    token = data.access_token
  })

  it('should get user when authenticated via JWT', async () => {
    const { status, data: user } = await $fetch('/api/user', { headers: { Authorization: `Bearer ${token}` } })
    expect(status).toBe(200)
    expect(user?.email).toBe('admin')
    expect(user?.role).toBe('admin')
  })

  it('should not get user when authenticated via wrong JWT', async () => {
    const { status } = await $fetch('/api/user', { headers: { Authorization: `Bearer a${token}` } })
    expect(status).toBe(401)
  })
})
