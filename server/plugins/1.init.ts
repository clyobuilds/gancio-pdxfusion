/**
* This is the first and only server plugin and this is where everything start
*/
import type { NitroApp } from 'nitropack'
import { defineNitroPlugin } from 'nitropack/runtime'
import { pluginController } from '~~/server/services'
import { useLogger } from '../lib/logger'
import { loadSettings, publicSettings } from '../services/settings'
import { useTaskManager } from '../services/taskManager'
import { connect, runMigrations } from '../services/db'
import { useCreateDirectoryStructure } from '../services/directories'

export default defineNitroPlugin(async (_nitroApp: NitroApp) => {
  const isTest = process.env.VITEST === 'true'

  const log = useLogger('init')
  try {
    log.info('Connecting to database')
    await connect()
    await runMigrations()
    log.info('Loading settings')
    await loadSettings()

    log.info('Checking directory structure')
    useCreateDirectoryStructure()

    if (!isTest) {
      log.info('Loading task manager')
      useTaskManager().start()

      log.info('Loading plugins')
      pluginController.initialize()
    }

    publicSettings.status = 'ready'
    return true
  } catch (e) {
    log.error(`Error connecting to database?`)
    log.error(e)
    process.exit(1)
  }
})
