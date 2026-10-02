import { describe, it, expect } from 'vitest'
import { cleanDatabase } from '../api/setup'
import { loadSettings } from '../../server/services'

await cleanDatabase()

describe('Settings', () => {
  it('should load settings', async () => {
    // this is loaded twice because the first time should create the pub/priv key
    await loadSettings()
    const publicSettings = await loadSettings()
    expect(publicSettings.publicKey).toBeDefined()
  })
})