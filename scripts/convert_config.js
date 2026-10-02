#!/usr/bin/env node

/**
 * this script converts gancio 1.0 config.json to new gancio 2.0 .env format
 * this is needed because nuxt3 does not accept host and port in nuxt.config.js as before
 */

import fs from 'fs'
import path from 'path'

const configPath = path.join(process.cwd(), 'config.json')
if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`)
  process.exit(1)
}
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))

function flattenObject(obj, prefix = '') {
  let flattened = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase()

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey))
    } else {
      flattened[newKey] = value
    }
  }

  return flattened
}

const flattenedConfig = flattenObject(configData)

// this is how nuxt/nitro expects host and port
flattenedConfig.HOST = flattenedConfig.SERVER_HOST
flattenedConfig.PORT = flattenedConfig.SERVER_PORT
delete flattenedConfig.SERVER_HOST
delete flattenedConfig.SERVER_PORT

// Generate .env content
let envContent = ''
for (const [key, value] of Object.entries(flattenedConfig)) {
  envContent += `${key}=${value}\n`
}

const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  console.log(`Warning: ${envPath} already exists, to avoid overwriting, please delete it manually`)
}
fs.writeFileSync(envPath, envContent)

console.log(`Config converted successfully to ${envPath}`)
