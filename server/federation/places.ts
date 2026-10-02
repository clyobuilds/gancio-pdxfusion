import type { CreationAttributes } from '@sequelize/core'
import { useLogger } from '../lib/logger'
import type { APEvent, APLocation } from './types'
import { publicSettings } from '../services/settings'
import type { Place } from '../services/db'

/**
  * Parses the location of an ActivityPub Event to extract physical and online locations.
  * @link https://www.w3.org/TR/activitystreams-vocabulary/#places
  * @link https://fediverse.codeberg.page/fep/fep/8a8e/#location
  */
export async function parseAPLocation(APEvent: APEvent) {
  const log = useLogger('federation:places')
  let place: CreationAttributes<Place>

  if (!APEvent?.location) {
    log.warn(`Event "${APEvent?.name}" has no location field`)
    throw new Error('Event has no location field')
  }

  const locations = Array.isArray(APEvent.location) ? APEvent.location : [APEvent.location]

  // find the first physical place from locations (we support only one physical place, if there are more we just ignore them)
  const location = locations.find(location => location?.type !== 'VirtualLocation')

  // get the list of online locations
  let online_locations = locations.filter(location => location?.type === 'VirtualLocation' && location?.url).map(location => location.url)

  // online locations could be in attachments too
  online_locations = online_locations.concat(APEvent?.attachment?.filter(a => a?.type === 'Link').map(a => a?.href).filter(a => a && !online_locations.includes(a)) ?? [])

  // we have a physical place
  if (location) {
    if (!location?.name) {
      log.warn(`Event has a location without a name: ${JSON.stringify(location)}`)
      throw new Error('Location must have at least a name')
    }

    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)
    place = {
      name: location?.name,
      ...(location?.id && { ap_id: location.id }),
      ...(!isNaN(latitude) && !isNaN(longitude) && { latitude, longitude })
    }
    // no physical but at least virtual location
  } else if (online_locations.length) {
    place = {
      name: 'online'
    }
    // nothing...
  } else {
    log.warn(`No Physical nor Virtual location: ${JSON.stringify(APEvent.location)}`)
    throw new Error('No Physical nor Virtual location')
  }

  // the `address` field could be Text, PostalAddress we do support the name as a fallback
  const address = location?.address
  if (address) {
    if (typeof address === 'string') {
      place.address = address
    } else if (address?.streetAddress || address?.addressLocality || address?.addressCountry || address?.addressRegion) {
      place.postal_address = address
      place.address = [address?.streetAddress, address?.addressLocality, address?.addressRegion, address?.addressCountry]
        .filter(part => part).join(', ')
    } else {
      log.warn(`Event "${APEvent?.name}" has bad address: ${JSON.stringify(address)}`)
    }
  } else {
    place.address = place.name
  }

  if (!place) {
    throw new Error('Place not found nor created')
  }

  return { place, online_locations }
}

/**
 * @returns ActivityStream location representation
 * @link https://www.w3.org/TR/activitystreams-vocabulary/#places
 */
export function PlaceToAP(place: Place): APLocation {
  return {
    id: place?.ap_id || `${publicSettings.baseurl}/federation/p/${place.id}`,
    type: 'Place',
    name: place.name,
    address: place.postal_address || place.address,
    url: place?.ap_id || `${publicSettings.baseurl}/place/${place.id}/${encodeURIComponent(place.name)}`,
    ...(place.latitude && place.longitude && ({ latitude: place.latitude, longitude: place.longitude }))
  }
}
