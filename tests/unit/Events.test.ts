import { describe, expect, it, vi } from 'vitest'
import { cleanDatabase } from '../api/setup'
import { mockH3Event, now } from './utils'
import { getEvents, publicSettings, setSetting } from '../../server/services'
import { getUser } from '../../server/lib/getUser'
import { DateTime } from 'luxon'
import { eventToAP, upsertEvent } from '../../server/services/events'

vi.mock('../../server/lib/getUser')
const mockedGetUser = vi.mocked(getUser)

const { adminUser, editorUser, userUser, anotherUser } = await cleanDatabase(true)
let event_id: number

const { default: handleEvent } = await import('../../server/api/events/index.post')
const { default: putHandler } = await import('../../server/api/events/[id]/index.put')
const { default: patchHandler } = await import('../../server/api/events/[id]/index.patch')
const { default: toggleHandler } = await import('../../server/api/events/[id]/toggle.put')
const { default: detailHandler } = await import('../../server/api/event/detail/[slug_or_id]')

describe('Events', () => {
  it('should create an anon event when allowed', async () => {
    await setSetting('allow_anon_event', true)
    const event = mockH3Event({
      method: 'POST',
      body: {
        title: 'test title', place_name: 'place name',
        place_address: 'address', tags: ['test'], start_datetime: now() + 1000
      }
    })
    const response = await handleEvent(event)
    expect(response).toHaveProperty('id')
    event_id = response.id
    expect(response).toHaveProperty('title', 'test title')
    expect(response).toHaveProperty('place.name', 'place name')
    expect(response).toHaveProperty('is_visible', false) // anon event should not be visible
    expect(response).toHaveProperty('is_anon', true)
  })

  it('should not create an event if anon event is not allowed', async () => {
    await setSetting('allow_anon_event', false)
    const event = mockH3Event({
      method: 'POST',
      body: {
        title: 'test title', place_name: 'place name',
        place_address: 'address', tags: ['test'], start_datetime: now() + 1000
      }
    })
    const response = handleEvent(event)
    await expect(response).rejects.toHaveProperty('statusCode', 400)
    await expect(response).rejects.toHaveProperty('message', 'Anonymous event update/creation not allowed')
  })

  it('should not allow event creation without required fields', async () => {
    const required_fields = {
      'title': {},
      'start_datetime': { title: 'test title' },
      'place_id or place_name and place_address are': { title: 'test title', start_datetime: now(), place_name: 'test place name' }
    }

    const promises = Object.keys(required_fields).map(async (field) => {
      const event = mockH3Event({ method: 'POST', body: required_fields[field] })
      const response = handleEvent(event)
      await expect(response).rejects.toHaveProperty('statusCode', 400)
      await expect(response).rejects.toHaveProperty('message', `${field} required`)
    })
    await Promise.all(promises)
  })

  it('should not get unconfirmed events', async () => {
    const detail = detailHandler(mockH3Event({ params: { slug_or_id: String(event_id) } }))
    await expect(detail).rejects.toHaveProperty('statusCode', 404)
    await expect(detail).rejects.toHaveProperty('statusMessage', 'Event not found')
  })

  it('should confirm/unconfirm event if allowed', async () => {
    mockedGetUser.mockResolvedValueOnce(undefined)
    let response = toggleHandler(mockH3Event({ method: 'PUT', params: { id: String(event_id) } }))
    await expect(response).rejects.toHaveProperty('statusMessage', 'Unauthorized')
    await expect(response).rejects.toHaveProperty('statusCode', 401)

    mockedGetUser.mockResolvedValueOnce(userUser)
    response = toggleHandler(mockH3Event({ method: 'PUT', params: { id: String(event_id) } }))
    await expect(response).rejects.toHaveProperty('statusMessage', 'Unauthorized')
    await expect(response).rejects.toHaveProperty('statusCode', 401)

    mockedGetUser.mockResolvedValueOnce(adminUser) // mock an admin user
    response = toggleHandler(mockH3Event({ method: 'PUT', params: { id: String(event_id) } }))
    await expect(response).resolves.toHaveProperty('is_visible', true)

    mockedGetUser.mockResolvedValueOnce(editorUser) // mock an editor user
    response = toggleHandler(mockH3Event({ method: 'PUT', params: { id: String(event_id) } }))
    await expect(response).resolves.toHaveProperty('is_visible', false)
  })

  it('should create an event as normal user', async () => {
    mockedGetUser.mockResolvedValueOnce(userUser)
    const event = mockH3Event({
      method: 'POST',
      body: {
        title: 'test title', place_name: 'place name',
        place_address: 'address', tags: ['test'], start_datetime: now() + 1000
      }
    })
    const response = await handleEvent(event)
    expect(response).toHaveProperty('id')
    event_id = response.id
    expect(response).toHaveProperty('title', 'test title')
    expect(response).toHaveProperty('place.name', 'place name')
    expect(response).toHaveProperty('is_visible', true)
    expect(response).toHaveProperty('is_mine', true)
    expect(response).toHaveProperty('is_anon', false)
  })

  it('should create an event using string as datime as in multipart/form-data', async () => {
    mockedGetUser.mockResolvedValueOnce(userUser)
    const event = mockH3Event({
      method: 'POST',
      body: {
        title: 'test title', place_name: 'place name',
        place_address: 'address', tags: ['test'],
        start_datetime: (now() + 1000).toString(),
        end_datetime: (now() + 2000).toString()
      }
    })
    const response = await handleEvent(event)
    expect(response).toHaveProperty('id')
    expect(response).toHaveProperty('title', 'test title')
    expect(response).toHaveProperty('place.name', 'place name')
    expect(response).toHaveProperty('is_visible', true)
    expect(response).toHaveProperty('is_mine', true)
    expect(response).toHaveProperty('is_anon', false)
  })

  it('should get detail of my hidden event', async () => {
    mockedGetUser.mockResolvedValue(userUser)
    const detail = await detailHandler(mockH3Event({ params: { slug_or_id: String(event_id) } }))
    expect(detail).toHaveProperty('id', event_id)
    expect(detail).toHaveProperty('title', 'test title')
    await toggleHandler(mockH3Event({ method: 'PUT', params: { id: String(event_id) } })) // hide the event
    const detail2 = await detailHandler(mockH3Event({ params: { slug_or_id: String(event_id) } }))
    expect(detail2).toHaveProperty('id', event_id)
    expect(detail2).toHaveProperty('title', 'test title')
  })

  it('should patch event status if allowed', async () => {
    mockedGetUser.mockResolvedValue(undefined)
    let response = patchHandler(mockH3Event({ params: { id: String(event_id) }, body: { status: 'EventCancelled' } }))
    await expect(response).rejects.toHaveProperty('statusCode', 401)
    await expect(response).rejects.toHaveProperty('statusMessage', 'Anonymous user cannot patch events')

    mockedGetUser.mockResolvedValueOnce(userUser)
    response = patchHandler(mockH3Event({ params: { id: String(event_id) }, body: { status: 'EventCancelled' } }))
    await expect(response).resolves.toHaveProperty('status', 'EventCancelled')
  })

  it('should modify title if allowed', async () => {
    const event = {
      title: 'new title',
      place_name: 'test',
      place_address: 'test',
      start_datetime: now(),
      end_datetime: now() + 1000
    }

    mockedGetUser.mockResolvedValueOnce(anotherUser)
    let response = putHandler(mockH3Event({ params: { id: String(event_id) }, body: event }))
    await expect(response).rejects.toHaveProperty('statusCode', 403)
    await expect(response).rejects.toHaveProperty('message', 'You are not authorized to modify this event')

    mockedGetUser.mockResolvedValueOnce(userUser)
    response = putHandler(mockH3Event({ params: { id: String(event_id) }, body: event }))
    await expect(response).resolves.toHaveProperty('title', 'new title')

    mockedGetUser.mockResolvedValueOnce(adminUser)
    response = putHandler(mockH3Event({ params: { id: String(event_id) }, body: { ...event, title: 'new title 2' } }))
    await expect(response).resolves.toHaveProperty('title', 'new title 2')
  })

  it('should remove empty field on update', async () => {
    const newEvent = {
      start_datetime: now(),
      place_name: 'test',
      place_address: 'test',
      title: 'new title',
      online_locations: ['https://test.com'],
      description: 'test description',
      end_datetime: now() + 1000,
      tags: ['test', 'tags']
    }
    mockedGetUser.mockResolvedValueOnce(userUser)
    let response = await handleEvent(mockH3Event({ body: newEvent }))
    const id = response.id
    const event = {
      start_datetime: now(),
      place_name: 'test',
      place_address: 'test',
      title: 'new title'
    }
    mockedGetUser.mockResolvedValueOnce(userUser)
    response = putHandler(mockH3Event({ params: { id: String(id) }, body: event }))
    await expect(response).resolves.toHaveProperty('title', 'new title')
    await expect(response).resolves.not.toHaveProperty('end_datetime')
    await expect(response).resolves.not.toHaveProperty('tags')
    await expect(response).resolves.not.toHaveProperty('online_locations')
    await expect(response).resolves.not.toHaveProperty('description')
  })

  it('should not allow start_datetime greater than end_datetime', async () => {
    const event = {
      title: ' test title 5',
      place_name: 'test',
      place_address: 'test',
      start_datetime: now() + 1000,
      end_datetime: now()
    }

    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).rejects.toHaveProperty('statusCode', 400)
    await expect(response).rejects.toHaveProperty('message', 'start_datetime is greater than end_datetime')
  })

  it('should not allow start_datetime greater than 3000', async () => {
    const event = {
      title: ' test title 5',
      start_datetime: DateTime.now().set({ year: 4000 }).toUnixInteger(),
      place_name: 'test',
      place_address: 'test'
    }

    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).rejects.toHaveProperty('statusCode', 400)
    await expect(response).rejects.toHaveProperty('message', 'start_datetime is too far in the future')
  })

  it('should validate start_datime', async () => {
    const event = {
      title: ' test title 5',
      start_datetime: 'antani',
      place_name: 'test'
    }

    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).rejects.toHaveProperty('statusCode', 400)
  })

  it('should validate end_datime', async () => {
    const event = {
      title: ' test title 5',
      start_datetime: now() + 1000,
      end_datetime: 'Antani',
      place_name: 'test',
      place_address: 'test'
    }

    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).rejects.toHaveProperty('statusCode', 400)
    await expect(response).rejects.toHaveProperty('message', 'end_datetime must be a valid timestamp')
  })

  it('should not allow open ended events if disabled', async () => {
    await setSetting('allow_event_without_end_time', false)
    const event = {
      title: 'open ended event',
      start_datetime: now() + 1000,
      place_name: 'test',
      place_address: 'test'
    }

    mockedGetUser.mockResolvedValueOnce(userUser)
    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).rejects.toHaveProperty('statusCode', 400)
    await expect(response).rejects.toHaveProperty('message', 'end_datetime is required')
  })

  it('should allow open ended events if enabled', async () => {
    await setSetting('allow_event_without_end_time', true)
    const event = {
      title: 'open ended event',
      start_datetime: now() + 1000,
      place_name: 'test',
      place_address: 'test'
    }

    mockedGetUser.mockResolvedValueOnce(adminUser)
    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).resolves.toHaveProperty('title', 'open ended event')
  })

  it('should add endTime to AP representation based on default duration', async () => {
    await setSetting('allow_event_without_end_time', true)
    const start_datetime = now() + 1000
    const eventPayload = {
      title: 'open ended event',
      start_datetime,
      place_name: 'test',
      place_address: 'test'
    }

    await setSetting('open_ended_event_default_duration', 3)
    const { event } = await upsertEvent(eventPayload, adminUser)
    const ap = eventToAP(event)
    expect(ap.name).toBe('open ended event')
    expect(ap.displayEndTime).toBeFalsy()
    expect(ap.endTime).toBe(DateTime.fromSeconds(start_datetime + 3 * 3600, { zone: publicSettings.instance_timezone }).toISO({ suppressMilliseconds: true }))
  })

  it('should get started open endend events', async () => {
    const event = {
      title: 'open ended started event',
      start_datetime: now() - 4000,
      place_name: 'test',
      place_address: 'test'
    }

    mockedGetUser.mockResolvedValueOnce(adminUser)
    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).resolves.toHaveProperty('title', 'open ended started event')

    let events = await getEvents({ start: now(), limit: 1 })
    expect(events[0]).toHaveProperty('title', 'open ended started event')

    // change the event default duration to 1h
    await setSetting('open_ended_event_default_duration', 1)
    events = await getEvents({ start: now(), limit: 1 })
    expect(events[0].title).not.toEqual('open ended started event')
  })

  it('should not allow create anonymous event in the past', async () => {
    const event = {
      title: 'anonymous event in the past',
      start_datetime: now() - 1,
      place_name: 'test',
      place_address: 'test'
    }

    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).rejects.toHaveProperty('statusCode', 400)
    await expect(response).rejects.toHaveProperty('message', 'Anonymous event update/creation not allowed')
  })

  it('should allow create event in the past when admin', async() => {
    const event = {
      title: 'authenticated event in the past',
      start_datetime: now() - 1,
      place_name: 'test',
      place_address: 'test'
    }

    mockedGetUser.mockResolvedValueOnce(adminUser)
    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).resolves.toHaveProperty('title', 'authenticated event in the past')
  })

  it('should trim tags and title', async () => {
    const event = {
      title: ' test title 4 ',
      place_name: 'test',
      place_address: 'test',
      start_datetime: now() + 1000,
      tags: [' test tag ']
    }

    mockedGetUser.mockResolvedValueOnce(userUser)
    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).resolves.toHaveProperty('title', 'test title 4')
    await expect(response).resolves.toHaveProperty('tags', ['test tag'])
  })

  it('should sanitize htlm in description', async () => {
    const event = {
      title: 'test title',
      place_name: 'test',
      place_address: 'test',
      start_datetime: now() + 1000,
      tags: ['test tags'],
      description: `<p wrong-attr="" onclick="alert('test');">inside paragraph</p><a href="https://test.com/?query=true&fbclid=facebook_id">link with fb reference</a>`
    }

    mockedGetUser.mockResolvedValueOnce(userUser)
    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).resolves.toHaveProperty('description', `<p>inside paragraph</p><a href="https://test.com/?query=true">link with fb reference</a>`)
  })

  it('should add event with only online location', async () => {
    const event = {
      title: 'test title',
      start_datetime: now() + 1000,
      online_locations: ['https://test.com']
    }
    mockedGetUser.mockResolvedValueOnce(userUser)

    const response = handleEvent(mockH3Event({ body: event }))
    await expect(response).resolves.toHaveProperty('online_locations', ['https://test.com'])
  })

  it('should return a valid ics if format is ics', async () => {
    const icsString = await detailHandler(mockH3Event({ params: { slug_or_id: String(event_id) }, query: { format: 'ics' } }))

    expect(icsString).toContain('BEGIN:VEVENT')
    expect(icsString).toContain('SUMMARY:new title')
    expect(icsString).toContain('LOCATION:test - test')
    expect(icsString).toContain('END:VEVENT')
  })

  it('should return a valid ics if accept is text/calendar', async () => {
    const icsString = await detailHandler(mockH3Event({ params: { slug_or_id: String(event_id) }, headers: { accept: 'text/calendar' } }))

    expect(icsString).toContain('BEGIN:VEVENT')
    expect(icsString).toContain('SUMMARY:new title')
    expect(icsString).toContain('LOCATION:test - test')
    expect(icsString).toContain('END:VEVENT')
  })
})
