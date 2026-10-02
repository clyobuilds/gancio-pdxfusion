/**
 * Parsing tests for ActivityPub Location objects
 * https://codeberg.org/fediverse/fep/src/branch/main/fep/8a8e/fep-8a8e.md#location
 */

import path from 'path'
import { describe, expect, it } from 'vitest'
import { parseAPLocation } from '../../server/federation/places'
import { APLocationSchema } from '../../server/federation/types'

async function loadJSON(filePath: string) {
  const fullPath = path.resolve(__dirname, filePath)
  return await import(fullPath).then(module => module.default)
}

describe('Location', () => {
  it('should fail parsing a location without a name', async () => {
    const location = await loadJSON('../fixtures/APLocation/bad-location-without-a-name.json')
    await expect(parseAPLocation({ location })).rejects.toThrow('Location must have at least a name')
  })

  it('should parse a location with only a name', async () => {
    const location = await loadJSON('../fixtures/APLocation/physical-location-without-id.json')
    const { place } = await parseAPLocation({ location })
    expect(place.name).toBe('Location without id')
    expect(place.ap_id).toBeUndefined()

    const parsedLocation = APLocationSchema.parse(location)
    expect(parsedLocation.name).toBe('Location without id')
  })

  it('should parse a location with id and name', async () => {
    const location = await loadJSON('../fixtures/APLocation/physical-location-no-address.json')
    const { place } = await parseAPLocation({ location })
    expect(place.name).toBe('Location with a name')
    expect(place.address).toBe('Location with a name')

    const parsedLocation = APLocationSchema.parse(location)
    expect(parsedLocation.name).toBe('Location with a name')
  })

  it('should parse a location with a simple string address', async () => {
    const location = await loadJSON('../fixtures/APLocation/physical-location-with-simple-string-address.json')
    const { place } = await parseAPLocation({ location })
    expect(place.name).toBe('Location with a simple string address')

    const parsedLocation = APLocationSchema.parse(location)
    expect(parsedLocation.name).toBe('Location with a simple string address')
  })

  it('should parse a location with a Postal Address', async () => {
    const location = await loadJSON('../fixtures/APLocation/physical-location-with-postal-address.json')
    const { place } = await parseAPLocation({ location })
    expect(place.name).toBe('Location with a postal address')
    expect(place.address).toBe('15 Fediverse Street, Fediverse Town, Steiermark, Austria')

    const parsedLocation = APLocationSchema.parse(location)
    expect(parsedLocation.name).toBe('Location with a postal address')
  })

  it('should parse a Virtual Location', async () => {
    const location = await loadJSON('../fixtures/APLocation/virtual-location.json')
    const { place, online_locations } = await parseAPLocation({ location })
    expect(place.name).toBe('online')
    expect(online_locations.length).toBe(1)
    expect(online_locations[0]).toBe('https://virtual.location.org')
  })

  it('should skip parsing a location with invalid geolocation fields lat/lng', async () => {
    const location = await loadJSON('../fixtures/APLocation/bad-geolocation-location.json')
    const { place } = await parseAPLocation({ location })
    expect(place.name).toBe('Location with a name and bad geolocation')
    expect(place.latitude).toBeUndefined()
    expect(place.longitude).toBeUndefined()
  })

  it('should parse a location with geolocation fields lat/lng', async () => {
    const location = await loadJSON('../fixtures/APLocation/geolocation-location.json')
    const { place } = await parseAPLocation({ location })
    expect(place.name).toBe('Location with a name and geolocation')
    expect(place.longitude).toBe(12.3456)
    expect(place.latitude).toBe(34.5678)
  })

  it('should parse a mixed location', async () => {
    const location = await loadJSON('../fixtures/APLocation/multiple-mixed-locations.json')
    const { place, online_locations } = await parseAPLocation({ location })
    expect(place.name).toBe('Location with a name')
    expect(online_locations.length).toBe(2)
    expect(online_locations[0]).toBe('https://virtual.location.org')
  })

  it('should parse a location with null address fields', async () => {
    const { default: location } = await import('../fixtures/APLocation/location-with-null-address-fields.json')
    const { place } = await parseAPLocation({ location })
    expect(place.name).toBe('Teatro Ponchielli')
    expect(place.address).toBe('Corso Vittorio Emanuele Ii 52, Cremona')

    const parsedLocation = APLocationSchema.parse(location)
    expect(parsedLocation.name).toBe('Teatro Ponchielli')
  })
})
