import { describe, expect, it } from 'vitest'
import { cleanDatabase } from '../api/setup'
import { mockH3Event, now } from './utils'
import { Event } from '../../server/services'
import { findOrCreateTags } from '../../server/services/tags'

await cleanDatabase()
describe('Tags', () => {
  it('should normalize tags with accents, hashtags, trim, etc..', async () => {
    const { normalizeTag } = await import('../../server/services/tags')
    expect(normalizeTag('NoTAV')).toBe('notav')
    expect(normalizeTag('Café')).toBe('cafe')
    expect(normalizeTag('naïve')).toBe('naive')
    expect(normalizeTag('façade')).toBe('facade')
    expect(normalizeTag('Straße')).toBe('strasse')
    expect(normalizeTag('İstanbul')).toBe('istanbul')
    expect(normalizeTag('  #Test  ')).toBe('test')
    expect(normalizeTag('música')).toBe('musica')
    expect(normalizeTag('$so spetto%:,')).toBe('sospetto')
    expect(normalizeTag('üniversite etkinliği')).toBe('universiteetkinligi')
    expect(normalizeTag('ÜNIVERSITE ETKINLIĞI')).toBe('universiteetkinligi')
  })

  it('should find or create tags removing duplicates', async () => {
    const tags = ['Tag1', 'tag1', 'TAG1']
    const result = await findOrCreateTags(tags)
    const tagNames = result.map(tag => tag.tag)
    expect(tagNames).toHaveLength(1)
    expect(tagNames).toContain('Tag1')
  })

  it('should return existing tag when found', async () => {
    const tags = ['TAG1']
    const result = await findOrCreateTags(tags)
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('Tag1')
  })

  it('should create new tag when not found', async () => {
    const tags = ['NewTag']
    const result = await findOrCreateTags(tags)
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('NewTag')
  })

  it('should return multiple tags when found', async () => {
    const tags = ['tAg1', 'Tag2']
    const result = await findOrCreateTags(tags)
    expect(result).toHaveLength(2)
    expect(result[0].tag).toBe('Tag1')
    expect(result[1].tag).toBe('Tag2')
  })

  it('should ignore empty tags', async () => {
    const tags = ['', 'Tag1']
    const result = await findOrCreateTags(tags)
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('Tag1')
  })

  it('should ignore duplicate existing tags', async () => {
    const tags = ['Tag1', 'Tag1 ']
    const result = await findOrCreateTags(tags)
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('Tag1')
  })

  it('should ignore non string tags', async () => {
    const tags = [123, 'tag1']
    const result = await findOrCreateTags(tags)
    expect(result).toHaveLength(1)
  })

  it('should create event with tags', async () => {
    const { default: handleEvent } = await import('../../server/api/events/index.post')
    const event = mockH3Event({
      body: {
        title: 'test tags',
        place_name: 'test',
        place_address: 'test',
        start_datetime: now() + 1000,
        tags: ['tag1', 'Tag2', 'tAg3']
      }
    })
    const result = await handleEvent(event)
    expect(result.tags).toHaveLength(3)
    expect(result.tags).toStrictEqual(['Tag1', 'Tag2', 'tAg3'])
  })

  it('should show no tags on non confirmed events', async () => {
    const { default: handleEvent } = await import('../../server/api/tags/index.get')
    const event = mockH3Event({ method: 'GET' })
    const result = await handleEvent(event)
    expect(result).toBeDefined()
    expect(result).toStrictEqual([])
  })

  it('should autocomplete tags for confirmed events', async () => {
    const event = await Event.create({
      title: 'test',
      is_visible: true,
      status: 'EventScheduled',
      start_datetime: now() + 1000
    })
    const tags = await findOrCreateTags(['tag1', 'Tag2', 'another'])
    await event.setTags(tags)

    const event2 = await Event.create({
      title: 'test 2',
      is_visible: false,
      status: 'EventScheduled',
      start_datetime: now() + 1000
    })
    const tags2 = await findOrCreateTags(['other', 'example'])
    await event2.setTags(tags2)

    const { default: handleEvent } = await import('../../server/api/tags/index.get')
    const h3event = mockH3Event({ method: 'GET' })
    const result = await handleEvent(h3event)
    expect(result).toContain('Tag1')
    expect(result).toContain('Tag2')
    expect(result).toContain('another')
    expect(result).toHaveLength(3)
  })

  it('should autocomplete on search', async () => {
    const { default: handleEvent } = await import('../../server/api/tags/index.get')
    const h3event = mockH3Event({ method: 'GET', query: { query: 'tag' } })
    const result = await handleEvent(h3event)
    expect(result).toContain('Tag1')
    expect(result).toContain('Tag2')
    expect(result).toHaveLength(2)
  })

  it('should return events searching by tag', async () => {
    const { default: handleEvent } = await import('../../server/api/events/index.get')
    const h3event = mockH3Event({ method: 'GET', query: { tags: 'tag1' } })
    const result = await handleEvent(h3event)
    expect(result).toHaveLength(1)
  })

  it('should return events searching by multiple tags on partial tag match', async () => {
    const { default: handleEvent } = await import('../../server/api/events/index.get')
    const h3event = mockH3Event({ method: 'GET', query: { tags: 'nonexistent,tag2' } })
    const result = await handleEvent(h3event)
    expect(result).toHaveLength(1)
  })

  it('should return events searching non normalized tag', async () => {
    const { default: handleEvent } = await import('../../server/api/events/index.get')
    const h3event = mockH3Event({ method: 'GET', query: { tags: ' #tag2 ' } })
    const result = await handleEvent(h3event)
    expect(result).toHaveLength(1)
  })
})
