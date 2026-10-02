import { $fetchRaw as fetch } from 'nitro-test-utils/e2e'
import { describe, expect, it, beforeAll } from 'vitest'

import { fetchWithAuth, cleanDatabase } from './setup'

describe('Settings', () => {
  beforeAll(async () => {
    await cleanDatabase(true)
  })
  it('should not change settings when not allowed', async () => {
    const { status } = await fetch('/api/settings', { method: 'PUT', body: JSON.stringify({ key: 'allow_anon_event', value: false }) })
    expect(status).toBe(401)
  })

  it('should change settings when allowed', async () => {
    const { status, data } = await fetchWithAuth('/api/settings', 'PUT', { key: 'allow_anon_event', value: true })
    expect(status).toBe(200)
    expect(data).toBe(true)
  })
})