import { defineEventHandler, setHeader } from 'h3'
import { publicSettings } from '~~/server/services'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/xrd+xml')
  return `<?xml version="1.0" encoding="UTF-8"?>
<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
  <Link rel="lrdd" type="application/xrd+xml" template="${publicSettings.baseurl}/.well-known/webfinger?resource={uri}"/>
</XRD>`
})
