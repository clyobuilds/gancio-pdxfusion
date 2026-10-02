import { defineEventHandler, setHeader } from 'h3'
import fs from 'fs/promises'
import path from 'path'
import { publicSettings, publicSettingsLastModified } from '../services/settings'
import { handleCache } from '../lib/API'

/**
 * return a custom css
 * this is a merge from custom settings available from admin panel
 * and a local `custom.css` file if present (ref: #610)
 * @cached
 */
export default defineEventHandler(async (event) => {
  // custom css from admin panel settings
  let custom_css = publicSettings.custom_css
  let stat = null
  let lastModified = publicSettingsLastModified.custom_css || new Date(0)

  try {
    // TODO: check if this is ok in production and in docker
    const filePath = path.resolve('./custom.css')
    stat = await fs.stat(filePath)
    custom_css += await fs.readFile(filePath, 'utf8')
    if (stat.mtime > lastModified) {
      lastModified = stat.mtime
    }
  } catch {
    custom_css += '\n/** no custom.css file **/'
  }

  setHeader(event, 'Content-Type', 'text/css')
  if (await handleCache(event, lastModified)) return
  return custom_css
})