import { defineEventHandler } from 'h3'
import path from 'path'
import { get as getConfig, runtimeResolve } from '../services/config'
import { serveFile } from '../helpers'
import { publicSettings } from '../services'

export default defineEventHandler(async (event) => {
  const config = getConfig()
  const imgPath = publicSettings.header_image ?
      path.resolve(config.upload_path, publicSettings.header_image) :
      runtimeResolve('./static/headerimage.svg')
  return serveFile(event, imgPath)
})