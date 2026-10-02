import { describe, expect, it } from 'vitest'
import { mockH3Event } from './utils'
import handler from '../../server/routes/federation/u/[name]/inbox.post'

describe('Inbox', () => {
  it('should reject empty actor', async () => {
    const evt = mockH3Event({ headers: { Accept: 'application/activity+json' }, method: 'POST' })
    const ret = handler(evt)
    await expect(ret).rejects.toHaveProperty('statusCode', 401)
    await expect(ret).rejects.toHaveProperty('message', 'Invalid actor name')
  })

  it('should reject empty body', async () => {
    const evt = mockH3Event({
      headers: { Accept: 'application/activity+json' },
      method: 'POST',
      params: { name: 'relay' }
    })
    const ret = handler(evt)
    await expect(ret).rejects.toHaveProperty('statusCode', 400)
    await expect(ret).rejects.toHaveProperty('message', 'Empty body')
  })

  it('should reject unmatched actor\' name', async () => {
    const evt = mockH3Event({ headers: { Accept: 'application/activity+json' }, method: 'POST', params: { name: 'non_existent' } })
    const ret = handler(evt)
    await expect(ret).rejects.toHaveProperty('statusCode', 404)
    await expect(ret).rejects.toHaveProperty('message', 'No actor found for non_existent (applicationActor is relay)')
  })

  it('should reject invalid JSON', async () => {
    const evt = mockH3Event({
      headers: { Accept: 'application/activity+json' },
      method: 'POST',
      params: { name: 'relay' },
      body: 'invalid json'
    })
    const ret = handler(evt)
    await expect(ret).rejects.toHaveProperty('statusCode', 400)
  })
})