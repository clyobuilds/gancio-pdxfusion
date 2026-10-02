import { $fetchRaw as $fetch } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('Outbox', () => {
  it('should return total items', async () => {
    const { status, headers, data } = await $fetch('/federation/u/relay/outbox', { headers: { Accept: 'application/activity+json' } })
    expect(status).toBe(200)
    expect(headers.get('Content-Type')).toMatch(/json/)
    expect(data.type).toBe('OrderedCollection')
    expect(data.totalItems).toBeDefined()
  })
})