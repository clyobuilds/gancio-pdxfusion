import { defineEventHandler } from 'h3'
import { useLogger } from '../lib/logger'

export default defineEventHandler(async (event) => {
  const log = useLogger('log')
  log.debug(event.path, event.method)
})
