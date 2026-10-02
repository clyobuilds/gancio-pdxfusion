import { $fetchRaw as $fetch } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('AP', () => {
  it('should redirect to / on html as accepted content type', async () => {
    const { status, headers } = await $fetch('/federation/u/relay', { redirect: 'manual', headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' } })
    expect(status).toBe(302)
    expect(headers.get('Location')).toBe('/')
  })

  it('should return a json when ld+json is accepted', async () => {
    const { status, headers } = await $fetch('/federation/u/relay', { headers: { Accept: 'application/ld+json' } })
    expect(status).toBe(200)
    expect(headers.get('Content-Type')).toMatch(/json/)
  })

  it('should return a json when activity+json is accepted', async () => {
    const { status, headers } = await $fetch('/federation/u/relay', { headers: { Accept: 'application/activity+json' } })
    expect(status).toBe(200)
    expect(headers.get('Content-Type')).toMatch(/json/)
  })

  // it('should return the AP Actor', async () => {
  //   const { status, headers, data } = await $fetch('/federation/u/relay', { headers: { Accept: 'application/activity+json' } })
  //   expect(status).toBe(200)
  //   expect(headers.get('Content-Type')).toMatch(/json/)
  //
  //   expect(data.type).toBe('Application')
  //   expect(data.preferredUsername).toBe('relay')
  //   console.error(data)
  //   expect(data.publicKey.publicKeyPem).toBeDefined()
  // })
})
