import { $fetchRaw } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('API', () => {
  it('responds successfully', async () => {
    const { data, status } = await $fetchRaw('/api/utils/ping')

    expect(status).toBe(200)
    expect(data).toBe('ready')
  })
})
