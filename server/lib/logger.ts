import { createConsola } from 'consola'

import { get as getConfig } from '../services/config'
const levelMap = {
  error: 0,
  fatal: 0,
  warn: 1,
  warning: 1,
  normal: 2,
  info: 3,
  debug: 4,
  trace: 5
}

const conf = getConfig()
export function useLogger(tag: string = 'app') {
  const logger = createConsola({ level: levelMap[conf.log_level] }).withTag(tag)
  logger.level = levelMap[conf.log_level]
  return logger
}
