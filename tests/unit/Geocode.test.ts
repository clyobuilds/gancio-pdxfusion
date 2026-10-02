import { beforeAll, describe, expect, it, vi } from 'vitest'
import { setSetting, publicSettings } from '../../server/services'
import { cleanDatabase } from '../api/setup'
import { mockH3Event } from './utils'
import { $fetch } from 'ofetch'

vi.mock('ofetch')
const mockedFetch = vi.mocked($fetch)

const { default: geocodeHandler } = await import('../../server/api/geocode/index')

describe('Geocoding', () => {
  beforeAll(async () => {
    await cleanDatabase(true)
  })

  it('should not be enabled by default', async () => {
    expect(publicSettings.allow_geolocation).toBe(false)
    const ret = geocodeHandler(mockH3Event({ query: { q: 'test' } }))
    await expect(ret).rejects.toHaveProperty('statusCode', 403)
  })

  it('should geocode when enabled', async () => {
    await setSetting('allow_geolocation', true)
    const ret = geocodeHandler(mockH3Event({ query: { q: 'test' } }))
    mockedFetch.mockResolvedValue([])
    await expect(ret).resolves.toBeDefined()
  })
})