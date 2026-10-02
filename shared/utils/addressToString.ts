import type { PostalAddress } from '~~/server/federation/types'

export function addressToString(address: PostalAddress | string) {
  if (typeof address === 'string') {
    return address
  }

  return [address?.streetAddress, address?.addressLocality, address?.addressRegion, address?.addressCountry]
    .filter(part => part).join(', ')
}
