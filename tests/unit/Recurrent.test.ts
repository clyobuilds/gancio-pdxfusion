import { describe, expect, it, vi } from 'vitest'
import { DateTime } from 'luxon'
import { cleanDatabase } from '../api/setup'
import { mockH3Event, now } from './utils'
import { Event, getEvents, setSetting } from '../../server/services'
import { getUser } from '../../server/lib/getUser'
import { createRecurrent, createRecurrentOccurrence, nextOccurrence } from '../../server/services/recurrent'

vi.mock('../../server/lib/getUser')
const mockedGetUser = vi.mocked(getUser)

const { adminUser } = await cleanDatabase(true)
// let event_id: number

const { default: handleEvent } = await import('../../server/api/events/index.post')
// const { default: patchHandler } = await import('../../server/api/events/[id]/index.patch')
const { default: toggleHandler } = await import('../../server/api/events/[id]/toggle.put')
const { default: deleteHandler } = await import('../../server/api/events/[id]/index.delete')

describe('Recurrent Events', () => {
  it('should not create a recurrent event when disabled', async () => {
    await setSetting('allow_recurrent_event', false)
    const event = mockH3Event({
      method: 'POST',
      body: {
        title: 'test title', place_name: 'place name',
        place_address: 'address', tags: ['test'], start_datetime: now() + 1000,
        recurrent: JSON.stringify({ frequency: '1w', type: 'ordinal' })
      }
    })
    const response = handleEvent(event)
    await expect(response).rejects.toHaveProperty('statusCode', 400)
    await expect(response).rejects.toHaveProperty('message', 'Recurrent event update/creation not allowed')
  })

  it('should create a recurrent event when allowed', async () => {
    await setSetting('allow_recurrent_event', true)
    const event = mockH3Event({
      method: 'POST',
      body: {
        title: 'test title', place_name: 'place name',
        place_address: 'address', tags: ['test'], start_datetime: now() + 1000,
        recurrent: JSON.stringify({ frequency: '1w', type: 'ordinal' })
      }
    })
    const response = await handleEvent(event)
    expect(response).toHaveProperty('id')
  })

  it('should create a weekly recurrent event without a type, as the event form does', async () => {
    const response = await handleEvent(mockH3Event({
      method: 'POST',
      body: {
        title: 'weekly without type', place_name: 'place name',
        place_address: 'address', start_datetime: now() + 1000,
        recurrent: JSON.stringify({ frequency: '1w' })
      }
    }))
    expect(response).toHaveProperty('id')
    expect((await Event.findByPk(response.id))?.recurrent).toMatchObject({ frequency: '1w' })
  })

  it('should check the show_recurrent settings in que', async () => {
    const event = await Event.create({
      title: 'test second title',
      is_visible: true,
      start_datetime: now() + 1000,
      recurrent: { frequency: '1w', type: 'ordinal' }
    })

    const occurrence = await createRecurrentOccurrence(event)
    expect(occurrence).toHaveProperty('id')

    // check getEvents
    let events = await getEvents({ show_recurrent: true })
    expect(events).toHaveLength(1)

    events = await getEvents({ show_recurrent: false })
    expect(events).toHaveLength(0)
  })

  it('should create an occurrence as soon as an anon recurrent event is confirmed', async () => {
    mockedGetUser.mockResolvedValueOnce(undefined)
    const parent = await handleEvent(mockH3Event({
      method: 'POST',
      body: {
        title: 'anon recurrent', place_name: 'place name',
        place_address: 'address', start_datetime: now() + 1000,
        recurrent: JSON.stringify({ frequency: '1w', type: 'ordinal' })
      }
    }))
    expect(parent).toHaveProperty('is_visible', false)
    expect(await Event.count({ where: { parentId: parent.id } })).toBe(0)

    mockedGetUser.mockResolvedValueOnce(adminUser)
    const response = await toggleHandler(mockH3Event({ method: 'PUT', params: { id: String(parent.id) } }))
    expect(response).toHaveProperty('is_visible', true)
    expect(await Event.count({ where: { parentId: parent.id } })).toBeGreaterThan(0)
  })

  it('should create all the occurrences of the next six months, only once', async () => {
    const start = DateTime.now().plus({ days: 1 })
    const parent = await Event.create({
      title: 'weekly', is_visible: true, start_datetime: start.toUnixInteger(), recurrent: { frequency: '1w', type: 'ordinal' }
    })
    await createRecurrent()
    const occurrences = await Event.findAll({ where: { parentId: parent.id }, order: [['start_datetime', 'ASC']] })
    // one each week for six months
    expect(occurrences.length).toBeGreaterThanOrEqual(26)
    expect(occurrences.length).toBeLessThanOrEqual(27)
    expect(occurrences[0]).toHaveProperty('start_datetime', parent.start_datetime)
    expect(occurrences.at(-1)!.start_datetime).toBeGreaterThan(start.plus({ months: 5, weeks: 3 }).toUnixInteger())
    expect(new Set(occurrences.map(o => o.start_datetime)).size).toBe(occurrences.length)

    // nothing more to create on next runs, even when called at the same time
    await Promise.all([createRecurrent(), createRecurrent()])
    expect(await Event.count({ where: { parentId: parent.id } })).toBe(occurrences.length)
  })

  it('should keep skipped occurrences skipped', async () => {
    const parent = await Event.findOne({ where: { title: 'weekly', parentId: null } })
    const occurrences = await Event.findAll({ where: { parentId: parent!.id }, order: [['start_datetime', 'ASC']] })

    mockedGetUser.mockResolvedValueOnce(adminUser)
    await toggleHandler(mockH3Event({ method: 'PUT', params: { id: String(occurrences[2]!.id) } }))
    await createRecurrent()
    expect(await Event.count({ where: { parentId: parent!.id } })).toBe(occurrences.length)
    expect(await Event.count({ where: { parentId: parent!.id, is_visible: false } })).toBe(1)
  })

  it('should remove upcoming occurrences when the recurrent event is removed', async () => {
    const parent = await Event.findOne({ where: { title: 'weekly', parentId: null } })
    mockedGetUser.mockResolvedValueOnce(adminUser)
    await deleteHandler(mockH3Event({ method: 'DELETE', params: { id: String(parent!.id) } }))
    expect(await Event.count({ where: { title: 'weekly' } })).toBe(0)
  })
})

describe('Recurrent Events occurrences', () => {
  const zone = 'America/Los_Angeles'
  const at = (iso: string) => DateTime.fromISO(iso, { zone })
  const next = (start: string, recurrent: object, from: string) =>
    nextOccurrence({ start_datetime: at(start).toUnixInteger(), recurrent } as Event, at(from))?.setZone(zone).toISO({ suppressMilliseconds: true })

  it('should use the instance timezone', async () => {
    await setSetting('instance_timezone', zone)
  })

  it('should return the recurrent event itself as first occurrence', () => {
    expect(next('2026-10-07T19:00', { frequency: '1w' }, '2026-10-01T00:00')).toBe('2026-10-07T19:00:00-07:00')
  })

  it('should keep the local time of weekly events across a DST change', () => {
    expect(next('2026-10-07T19:00', { frequency: '1w' }, '2026-10-07T19:00:01')).toBe('2026-10-14T19:00:00-07:00')
    expect(next('2026-10-07T19:00', { frequency: '1w' }, '2026-11-10T00:00')).toBe('2026-11-11T19:00:00-08:00')
    expect(next('2026-10-07T19:00', { frequency: '1w' }, '2027-03-16T00:00')).toBe('2027-03-17T19:00:00-07:00')
  })

  it('should keep events each two weeks on their weeks', () => {
    expect(next('2026-10-07T19:00', { frequency: '2w' }, '2026-10-08T00:00')).toBe('2026-10-21T19:00:00-07:00')
    expect(next('2026-10-07T19:00', { frequency: '2w' }, '2026-10-15T00:00')).toBe('2026-10-21T19:00:00-07:00')
    expect(next('2026-10-07T19:00', { frequency: '2w' }, '2026-10-22T00:00')).toBe('2026-11-04T19:00:00-08:00')
  })

  it('should find the nth weekday of the month in the instance timezone', () => {
    // first saturday of the month, in the evening (it is already sunday in UTC)
    const firstSaturday = { frequency: '1m', type: '1' }
    expect(next('2026-10-03T19:00', firstSaturday, '2026-10-04T00:00')).toBe('2026-11-07T19:00:00-08:00')
    expect(next('2026-10-03T19:00', firstSaturday, '2026-11-08T00:00')).toBe('2026-12-05T19:00:00-08:00')
    expect(next('2026-10-03T19:00', firstSaturday, '2027-01-03T00:00')).toBe('2027-02-06T19:00:00-08:00')
    // last friday of the month
    const lastFriday = { frequency: '1m', type: '-1' }
    expect(next('2026-10-30T20:00', lastFriday, '2026-10-31T00:00')).toBe('2026-11-27T20:00:00-08:00')
    expect(next('2026-10-30T20:00', lastFriday, '2026-11-28T00:00')).toBe('2026-12-25T20:00:00-08:00')
  })

  it('should repeat on the same day of the month', () => {
    const ordinal = { frequency: '1m', type: 'ordinal' }
    expect(next('2026-10-15T19:00', ordinal, '2026-10-16T00:00')).toBe('2026-11-15T19:00:00-08:00')
    // on the last day of shorter months
    expect(next('2026-10-31T19:00', ordinal, '2026-11-01T00:00')).toBe('2026-11-30T19:00:00-08:00')
    expect(next('2026-10-31T19:00', ordinal, '2026-12-01T00:00')).toBe('2026-12-31T19:00:00-08:00')
    // each two months
    expect(next('2026-10-15T19:00', { frequency: '2m', type: 'ordinal' }, '2026-10-16T00:00')).toBe('2026-12-15T19:00:00-08:00')
  })

  it('should repeat each year in the same month', () => {
    expect(next('2026-10-03T19:00', { frequency: '1y', type: 'ordinal' }, '2026-12-01T00:00')).toBe('2027-10-03T19:00:00-07:00')
    expect(next('2026-10-03T19:00', { frequency: '1y', type: '1' }, '2026-12-01T00:00')).toBe('2027-10-02T19:00:00-07:00')
  })
})
