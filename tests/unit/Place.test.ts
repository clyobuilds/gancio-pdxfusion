import { describe, expect, it, vi } from 'vitest'
import { now, cleanDatabase } from '../api/setup'
import { getUser } from '../../server/lib/getUser'
import { mockH3Event } from './utils'
import { findOrCreatePlace } from '../../server/services/places'

let place_id: number
vi.mock('../../server/lib/getUser')
const mockedGetUser = vi.mocked(getUser)
const { adminUser, editUser, userUser } = await cleanDatabase(true)
const { default: eventPlaceHandler } = await import('../../server/api/events/place/[place]')
const { default: createEventHandler } = await import('../../server/api/events/index.post')
const { default: placesHandler } = await import('../../server/api/places/index.get')

describe('Place', async () => {
  it('should create a new place creating an event', async () => {
    mockedGetUser.mockResolvedValue(adminUser)
    const event = {
      title: 'test event', start_datetime: now() + 1000,
      place_name: 'test new place', place_address: 'test address'

    }
    let response = await createEventHandler(mockH3Event({ body: event }))
    expect(response.is_visible).toBe(true)
    expect(response.place.name).toBe('test new place')
    place_id = response.place.id

    response = await eventPlaceHandler(mockH3Event({ params: { place: String(place_id) } }))
    expect(response.place.name).toBe('test new place')
  })

  it('should create a new place creating event using place_id', async () => {
    const event = {
      title: 'test event', start_datetime: now() + 1000,
      place_id
    }

    const response = await createEventHandler(mockH3Event({ body: event }))
    expect(response.is_visible).toBe(true)
    expect(response.place.name).toBe('test new place')
  })

  it('only admin should get all places', async () => {
    const { default: placeList } = await import('../../server/api/places/list.get')

    mockedGetUser.mockResolvedValueOnce(undefined)
    let ret = placeList(mockH3Event({}))
    await expect(ret).rejects.toHaveProperty('statusCode', 401)

    mockedGetUser.mockResolvedValueOnce(editUser)
    ret = placeList(mockH3Event({}))
    await expect(ret).rejects.toHaveProperty('statusCode', 401)

    mockedGetUser.mockResolvedValueOnce(userUser)
    ret = placeList(mockH3Event({}))
    await expect(ret).rejects.toHaveProperty('statusCode', 401)

    mockedGetUser.mockResolvedValueOnce(adminUser)
    ret = await placeList(mockH3Event({}))
    expect(ret).toHaveLength(1)
  })

  it('should search for a place', async () => {
    const ret = await placesHandler(mockH3Event({ query: { query: 'Test' } }))
    expect(ret.length).toBe(1)
  })

  it('should trim place\'s name and address', async () => {
    const place = await findOrCreatePlace({ name: ' test place with white Space ', address: ' address with Space ' })
    expect(place?.name).toBe('test place with white Space')
    expect(place?.address).toBe('address with Space')
  })

  it('should accept a place with a postal address', async () => {
    const postalAddress = {
      type: 'PostalAddress',
      addressCountry: 'Austria',
      addressLocality: 'Fediverse Town',
      addressRegion: 'Steiermark',
      postalCode: '8010',
      streetAddress: '15 Fediverse Street'
    }

    const ret = await createEventHandler(mockH3Event({
      body: {
        title: 'test postal address', place_name: 'test place',
        place_postal_address: JSON.stringify(postalAddress), start_datetime: now() + 1000
      }
    }))
    expect(ret.place.name).toBe('test place')
    expect(ret.place.address).toBe('15 Fediverse Street, Fediverse Town, Steiermark, Austria')
  })

  it('should get limited results', async () => {
    let ret = await placesHandler(mockH3Event({}))
    expect(ret.length).toBe(2)
    ret = await placesHandler(mockH3Event({ query: { limit: '1' } }))
    expect(ret.length).toBe(1)
  })
})
