import { $fetchRaw as $fetch } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('Webfinger', () => {
  it('should return a 404 on bad request', async () => {
    const { status } = await $fetch('/.well-known/webfinger')
    expect(status).toBe(400)
  })

  it('should return webfinger response', async () => {
    const { data, status, headers } = await $fetch('/.well-known/webfinger?resource=acct:relay@localhost:13120')
    expect(status).toBe(200)
    expect(headers.get('Content-Type')).toBe('application/jrd+json')
    expect(data?.subject).toBe('acct:relay@localhost:13120')
  })
})