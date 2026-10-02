import { defineEventHandler } from 'h3'
import { handleCache } from '~~/server/lib/API'
import { getMaxLastModifieds, publicSettings, publicSettingsLastModified } from '~~/server/services'

export default defineEventHandler(async (evt) => {
  const nodeinfo = {
    links: [
      { href: `${publicSettings.baseurl}/.well-known/nodeinfo/2.0`, rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0' },
      { href: `${publicSettings.baseurl}/.well-known/nodeinfo/2.1`, rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1' },
      ...publicSettings.enable_federation
        ? [{
            rel: 'https://www.w3.org/ns/activitystreams#Application',
            href: `${publicSettings.baseurl}/federation/u/${publicSettings?.instance_name ?? 'relay'}`
          }]
        : []
    ]
  }

  const lastModified = getMaxLastModifieds([
    publicSettingsLastModified.instance_name,
    publicSettingsLastModified.baseurl,
    publicSettingsLastModified.enable_federation])

  if (await handleCache(evt, lastModified)) return
  return nodeinfo
})
