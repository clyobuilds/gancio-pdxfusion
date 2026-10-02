import { describe, expect, it } from 'vitest'
import { $fetchRaw as fetch } from 'nitro-test-utils/e2e'
// import { fetchWithAuth, now } from './setup'

describe('Export', () => {
  it('should export an rss feed', async () => {
    const { headers, status } = await fetch('/feed/rss')
    expect(status).toBe(200)
    expect(headers.get('content-type')).toMatch(/application\/rss\+xml/)
  })

  it('should export a json feed', async () => {
    const { headers, status } = await fetch('/feed/json')
    expect(status).toBe(200)
    expect(headers.get('content-type')).toMatch(/application\/json/)
  })

  it('should export an ics feed', async () => {
    const { headers, status } = await fetch('/feed/ics')
    expect(status).toBe(200)
    expect(headers.get('content-type')).toMatch(/text\/calendar/)
  })
})