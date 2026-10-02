import { $fetchRaw as $fetch } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('Nodeinfo', () => {
  it('shoud return a json content', async () => {
    const { status, headers } = await $fetch('/.well-known/nodeinfo')
    expect(status).toBe(200)
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('shoud support nodeinfo 2.0 and 2.1', async () => {
    const { data: res } = await $fetch('/.well-known/nodeinfo')
    expect(res.links.find(l => l.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.0')?.href).toContain('/.well-known/nodeinfo/2.0')
    expect(res.links.find(l => l.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.1')?.href).toContain('/.well-known/nodeinfo/2.1')
  })

  it('shoud implement FEP-2677 - Application Actor', async () => {
    const { data: response } = await $fetch('/.well-known/nodeinfo')
    expect(response.links.find(l => l.rel === 'https://www.w3.org/ns/activitystreams#Application')?.href).toContain('/federation/u/relay')
  })
})
