import { defineEventHandler } from 'h3'
import path from 'path'
import { get as getConfig, runtimeResolve } from '../services/config'
import { publicSettings } from '../services'
import { serveFile } from '../helpers'

export default defineEventHandler(async (event) => {
  const config = getConfig()
  const imgPath = publicSettings.fallback_image ?
      path.resolve(config.upload_path, publicSettings.fallback_image) :
      runtimeResolve('./static/fallbackimage.svg')
  return serveFile(event, imgPath)
})