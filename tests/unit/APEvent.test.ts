/**
 * Parsing tests for ActivityPub Event objects
 * https://fediverse.codeberg.page/fep/fep/8a8e/
 */

import path from 'path'
import { describe, expect, it } from 'vitest'

import { APEventSchema } from '../../server/federation/types'

async function loadJSON(filePath: string) {
  const fullPath = path.resolve(__dirname, filePath)
  return await import(fullPath).then(module => module.default)
}

describe('Event Schema Validator', () => {
  // https://fediverse.codeberg.page/fep/fep/8a8e/#object-type-event
  it('should parse an event with required fields only (name, startTime, endTime)', async () => {
    const event = await loadJSON('../fixtures/APEvent/minimum.json')
    const { success, error, data } = APEventSchema.safeParse(event)
    expect(error).toBeUndefined()
    expect(success).toBe(true)
    expect(data?.name).toBe('Minimal event')
    expect(data?.startTime).toBe('2026-02-12T00:00:00.000+01:00')
    expect(data?.endTime).toBe('2026-02-12T01:00:00.000+01:00')
  })

  it('should fail to parse an event with missing required fields', async () => {
    const event = await loadJSON('../fixtures/APEvent/missing-required.json')
    const { success, error, data } = APEventSchema.safeParse(event)
    expect(success).toBe(false)
    expect(error).toBeDefined()
    expect(data).toBeUndefined()
    expect(error?.issues.some(issue => issue.path.includes('startTime'))).toBe(true)
  })

  it('should fail to parse an event with invalid date format', async () => {
    const event = await loadJSON('../fixtures/APEvent/invalid-date.json')
    const { success, error, data } = APEventSchema.safeParse(event)
    expect(success).toBe(false)
    expect(error).toBeDefined()
    expect(data).toBeUndefined()
    expect(error?.issues.some(issue => issue.path.includes('startTime'))).toBe(true)
  })

  it('should fail to parse an event with endTime before startTime', async () => {
    const event = await loadJSON('../fixtures/APEvent/end-before-start.json')
    const { success, error, data } = APEventSchema.safeParse(event)
    expect(success).toBe(false)
    expect(error).toBeDefined()
    expect(data).toBeUndefined()
    expect(error?.issues.some(issue => issue.message === 'endTime must be after startTime')).toBe(true)
  })

  it('should parse an event without endTime', async () => {
    const event = await loadJSON('../fixtures/APEvent/no-endTime.json')
    const { success, error, data } = APEventSchema.safeParse(event)
    expect(success).toBe(true)
    expect(error).toBeUndefined()
    expect(data?.endTime).toBeUndefined()
  })

  it('should parse an event with tags', async () => {
    const event = await loadJSON('../fixtures/APEvent/with-tags.json')
    const { success, error, data } = APEventSchema.safeParse(event)
    expect(success).toBe(true)
    expect(error).toBeUndefined()
    expect(data?.tag).toBeDefined()
    expect(data?.tag?.length).toBe(1)
    expect(data?.tag?.[0]?.name).toBe('#tag')
  })

  it('should parse an event with attachments', async () => {
    const event = await loadJSON('../fixtures/APEvent/with-attachment.json')
    const { success, error, data } = APEventSchema.safeParse(event)
    expect(success).toBe(true)
    expect(error).toBeUndefined()
    expect(data?.attachment).toBeDefined()
    expect(data?.attachment?.length).toBe(1)
    expect(data?.attachment?.[0]?.type).toBe('Image')
    expect(data?.attachment?.[0]?.url).toBe('https://example.com/image.jpg')
  })

  it('should parse an event from mobilizon', async () => {
    const { default: event } = await import('../fixtures/APEvent/mobilizon.json')
    const { success } = APEventSchema.safeParse(event)
    expect(success).toBe(true)
  })
})
