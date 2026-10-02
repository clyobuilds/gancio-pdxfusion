import { defineEventHandler } from 'h3'
import path from 'path'
import { get as getConfig, runtimeResolve } from '../services/config'
import { serveFile } from '../helpers'
import { publicSettings } from '../services'

export default defineEventHandler(async (event) => {
  const config = getConfig()
  const logoPath = publicSettings.logo ? path.resolve(config.upload_path, publicSettings.logo) : runtimeResolve('./static/logo.png')
  return serveFile(event, logoPath)
})