import type { PostalAddress } from '../federation/types'
import { useLogger } from '../lib/logger'
import { publicSettings } from './settings'
import { addressToString } from '../../shared/utils/addressToString'
import { $fetch } from 'ofetch'

const log = useLogger('geocode:nominatim')

export type NominatimResult = {
  class: string
  osm_type: 'way' | 'house' | 'node' | 'relation'
  namedetails?: {
    alt_name?: string
    name?: string
  }
  lat: number
  lon: number
  display_name: string
  address?: {
    house_number?: string
    road?: string
    pedestrian?: string
    footway?: string
    city?: string
    town?: string
    village?: string
    suburb?: string
    state?: string
    county?: string
    postcode?: string
    country?: string
    country_code?: string
  }
}

export function mapNominatimToPostalAddress(place: NominatimResult) {
  if (!place.address) return null

  const a = place.address

  const street =
    [a.house_number, a.road || a.pedestrian || a.footway]
      .filter(Boolean)
      .join(' ') || undefined

  const locality =
    a.city || a.town || a.village || a.suburb || undefined

  const region =
    a.state || a.county || undefined

  const country =
    a.country || (a.country_code?.toUpperCase())

  return {
    type: 'PostalAddress',
    streetAddress: street,
    addressLocality: locality,
    addressRegion: region,
    postalCode: a.postcode,
    addressCountry: country
  } as PostalAddress
}

function getIcon(item: NominatimResult) {
  if (['place', 'amenity', 'shop', 'tourism', 'leisure', 'building'].includes(item.class)) {
    return 'mdi-home'
  }

  const type = item.osm_type
  const iconMap = {
    way: 'mdi-road-variant',
    house: 'mdi-home',
    node: 'mdi-map-marker',
    relation: 'mdi-city-variant'
  }

  return type in iconMap ? iconMap[type] : 'mdi-home'
}

type PhotonResult = {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    housenumber?: string
    street?: string
    city?: string
    district?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
    countrycode?: string
    osm_key?: string
  }
}

// Photon (https://photon.komoot.io) is built for search-as-you-type; the public Nominatim server forbids that.
// Only the Portland area (Vancouver to Wilsonville, Hillsboro to Troutdale) is searched, and only results with a
// house number are kept: a calendar needs a street address, not a town, county or bare street.
const PHOTON_BBOX = '-123.4,45.15,-122.2,45.85'

async function queryPhoton(endpoint: string, q: string) {
  const result = await $fetch<{ features?: PhotonResult[] }>(endpoint, {
    params: { q, limit: 15, lang: 'en', bbox: PHOTON_BBOX, layer: ['house', 'other'] },
    headers: { 'User-Agent': 'gancio' }
  })
  return (result?.features ?? []).filter(f => f.properties.housenumber).slice(0, 5).map((f) => {
    const p = f.properties
    const address = {
      type: 'PostalAddress',
      streetAddress: [p.housenumber, p.street].filter(Boolean).join(' ') || undefined,
      addressLocality: p.city || p.district || p.county || undefined,
      addressRegion: p.state,
      postalCode: p.postcode,
      addressCountry: p.country
    } as PostalAddress
    // a place with its own name (a venue) shows that name; a plain street address has none
    const name = p.name
    return {
      icon: name ? 'mdi-map-marker' : 'mdi-home',
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      address,
      display_name: addressToString(address),
      name
    }
  })
}

// https://nominatim.org/release-docs/latest/api/Search/
export async function queryNominatim(q: string) {
  const endpoint = publicSettings.geocoding_provider || 'https://nominatim.openstreetmap.org/search'

  if (endpoint.includes('photon')) {
    log.info('Fetching suggestions for', q)
    return queryPhoton(endpoint, q)
  }

  log.info('Fetching details for', q)

  const countrycodes = publicSettings.geocoding_countrycodes || []
  const params = {
    countrycodes: countrycodes.join(','),
    q,
    limit: 3,
    format: 'json',
    addressdetails: 1,
    namedetails: 1
  }

  const addressList = await $fetch<NominatimResult[]>(endpoint, {
    params,
    headers: { 'User-Agent': `gancio` }
  })

  return addressList?.map((v) => {
    const name = v?.namedetails?.alt_name ?? v?.namedetails?.name
    const address = mapNominatimToPostalAddress(v)
    return {
      icon: getIcon(v),
      lat: v.lat,
      lon: v.lon,
      address,
      display_name: addressToString(address || ''),
      name
    }
  })
}
