import { defineEventHandler, setHeader } from 'h3'
import fs from 'fs/promises'
import path from 'path'
import { publicSettings, publicSettingsLastModified } from '../services/settings'
import { handleCache } from '../lib/API'

/**
 * return a custom js
 * this is a merge from custom settings available from admin panel
 * and a local `custom.js` file if present (ref: #610)
 * @cached
 */
export default defineEventHandler(async (event) => {
  // custom css from admin panel settings
  let custom_js = publicSettings.custom_js
  let stat = null
  let lastModified = publicSettingsLastModified.custom_js || new Date(0)

  try {
    // TODO: check if this is ok in production and in docker
    const filePath = path.resolve('./custom.js')
    stat = await fs.stat(filePath)
    custom_js += await fs.readFile(filePath, 'utf8')
    if (stat.mtime > lastModified) {
      lastModified = stat.mtime
    }
  } catch {
    custom_js += '\n/** no custom.js file **/'
  }

  setHeader(event, 'Content-Type', 'application/javascript')
  if (await handleCache(event, lastModified)) return
  return custom_js
})