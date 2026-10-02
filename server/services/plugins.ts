import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { runtimeResolve } from '../services/config'
import * as db from './db'
import { useLogger } from '../lib/logger'
import { type H3Event, createError, getRouterParam } from 'h3'
import { getSetting, publicSettings, setSetting } from './settings'
import { parseIcsData } from './icsparser'
import { type TaskManager, useTaskManager } from './taskManager'
import type { EventAPI } from '~~/shared/types/generic'
import type { PluginSettings, Settings } from '~~/shared/types/settings'
import { findOrCreateTags } from './tags'
import type { EventType } from '../lib/emitter'
import emitter from '../lib/emitter'
import { getEvents, upsertEvent } from './events'
import { getUser } from '../lib/getUser'
import { isRole, requireAdmin, requireRole, requireUser } from '../lib/auth'
import type { Handler } from 'mitt'

const log = useLogger('plugins')
const PLUGIN_SETTINGS_PREFIX = 'plugin_'

const PLUGIN_EVENTS_MAPPING: [keyof EventType, string][] = [
  ['event:Create', 'onEventCreate'],
  ['event:Delete', 'onEventDelete'],
  ['event:Update', 'onEventUpdate']
]

// To store the associated event functions bound to the plugin
type EventListenerRecord = [keyof EventType, Handler]

export type GancioPluginManifest = {
  /** name of plugin, this is a key and must be unique */
  name: string
  author?: string
  version?: string
  url?: string
  /** a small plugin description, support html */
  description?: string
  settings?: {
    [key: string]: {
      type?: 'NUMBER' | 'TEXT' | 'CHECK' | 'LIST' | 'URL'
      items?: string[] // for type LIST, the possible values
      description?: string
      required?: boolean
      hint?: string
      default?: string | number | boolean
      min?: number // For the NUMBER type
      max?: number // For the NUMBER type
    }
  }
}

export type GancioPluginSettingsValues = PluginSettings

type LogType = 'silent' | 'fatal' | 'error' | 'warn' | 'log' | 'info' | 'success' | 'fail' | 'ready' | 'start' | 'box' | 'debug' | 'trace' | 'verbose'
interface LogFn {
  (message: unknown, ...args: unknown[]): void
}

export interface GancioContext {
  log: Record<LogType, LogFn>
  db: typeof db
  publicSettings: Settings
  services: {
    parseIcsData: typeof parseIcsData
    TaskManager: TaskManager
    findOrCreateTags: typeof findOrCreateTags
    upsertEvent: typeof upsertEvent
    getEvents: typeof getEvents
    getUser: typeof getUser
    requireAdmin: typeof requireAdmin
    isRole: typeof isRole
    requireRole: typeof requireRole
    requireUser: typeof requireUser
  }
}

export type GancioPlugin = {
  settings?: PluginSettings
  manifest: GancioPluginManifest
  load: (settings?: unknown) => Promise<void> | void
  unload?: () => Promise<void> | void
  onTest?: (settings: PluginSettings) => Promise<void> | void
  routeAPI?: (event: H3Event) => unknown

  onCLI?: (args: string[]) => Promise<void> | void
  onEventCreate?: (event: EventAPI) => Promise<void> | void
  onEventDelete?: (event: EventAPI) => Promise<void> | void
  onEventUpdate?: (event: EventAPI) => Promise<void> | void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} & Record<string, any> // allow plugins to have custom properties/methods

export class PluginController {
  plugins: GancioPlugin[] = []

  // To store the associated event functions bound to the plugins
  #pluginsEvents = new Map<string, EventListenerRecord[]>()

  async togglePlugin(name: string): Promise<void> {
    const plugin = this.getPlugin(name)
    if (!plugin) throw createError({ statusCode: 404, message: 'Plugin not found' })

    const enable = !this.getSettings(plugin)?.enable
    if (enable) {
      await this.#enablePlugin(plugin)
    } else {
      await this.#disablePlugin(plugin)
    }
  }

  async runCLI(name: string, args: string[]) {
    const plugin = this.getPlugin(name)
    if (!plugin || typeof plugin.onCLI !== 'function') {
      log.warn(`Plugin ${name} not found or onCLI not found`)
      return
    }

    return plugin.onCLI(args)
  }

  async routeAPI(evt: H3Event) {
    const pluginName = getRouterParam(evt, 'name')

    if (!pluginName) {
      throw createError({ statusCode: 400, statusMessage: 'Plugin name is required' })
    }

    const plugin = this.getPlugin(pluginName)
    if (!plugin || typeof plugin.routeAPI !== 'function') {
      log.warn(`Plugin ${pluginName} not found or routeAPI not found`)
      throw createError({ statusCode: 404, message: 'Plugin or routeAPI method not found' })
    }

    // is plugin enabled?
    if (!plugin.settings?.enable) {
      log.warn(`Plugin ${pluginName} is not enabled`)
      throw createError({ statusCode: 403, message: 'Plugin is not enabled' })
    }

    return plugin.routeAPI(evt)
  }

  async testPlugin(name: string, settings?: PluginSettings) {
    const plugin = this.getPlugin(name)

    if (!plugin || typeof plugin.onTest !== 'function') {
      throw createError({ statusCode: 404, message: 'Plugin or test method not found' })
    }

    const testSettings = settings ?? this.getSettings(plugin)
    log.debug(`Testing plugin "${name}" with settings:`, testSettings)

    return plugin.onTest(testSettings)
  }

  async enablePlugin(pluginOrName: string | GancioPlugin): Promise<void> {
    const plugin = typeof pluginOrName === 'string'
      ? this.getPlugin(pluginOrName)
      : pluginOrName

    if (!plugin)
      throw createError({ statusCode: 404, message: 'Plugin not found' })

    if (plugin.settings?.enable) {
      throw new Error(`Plugin ${plugin.manifest.name} is already enabled`)
    }
    return this.#enablePlugin(plugin)
  }

  async disablePlugin(pluginOrName: string | GancioPlugin): Promise<void> {
    const plugin = typeof pluginOrName === 'string'
      ? this.getPlugin(pluginOrName)
      : pluginOrName

    if (!plugin)
      throw createError({ statusCode: 404, message: 'Plugin not found' })

    if (!plugin.settings?.enable) {
      throw new Error(`Plugin ${plugin.manifest.name} is already disabled`)
    }

    return this.#disablePlugin(plugin)
  }

  async #enablePlugin(plugin: GancioPlugin) {
    const { name } = plugin.manifest

    log.info(`Loading plugin "${plugin.manifest.name}"`)

    const oldSettings = this.getSettings(plugin)
    log.info(`Settings for plugin "${name}":`, oldSettings)

    const newSettings = { ...oldSettings, enable: true }
    await this.setSettings(plugin, newSettings, { allowEnable: true })

    try {
      await plugin.load()
      this.#attachEvents(plugin)
    } catch (error) {
      log.error(`Error during load of ${name}:`, error)
      // Revert enabled flag in settings if something went wrong during load
      await this.setSettings(plugin, oldSettings, { allowEnable: true })
      throw error
    }
  }

  async #disablePlugin(plugin: GancioPlugin) {
    const { name } = plugin.manifest
    log.info(`Unloading plugin "${name}"`)

    try {
      this.#detachEvents(plugin)

      plugin?.unload?.()
    } catch (error) {
      log.error(`Error during unload of "${name}":`, error)
      throw error
    }

    const oldSettings = this.getSettings(plugin)
    const newSettings = { ...oldSettings, enable: false }
    await this.setSettings(plugin, newSettings, { allowEnable: true })
  }

  #attachEvents(plugin: GancioPlugin) {
    const { name } = plugin.manifest
    const events = this.#pluginsEvents.get(name) ?? []

    for (const [eventName, listenerName] of PLUGIN_EVENTS_MAPPING) {
      const listener = plugin[listenerName]
      if (typeof listener === 'function') {
        const eventRecord: EventListenerRecord = [eventName, listener.bind(plugin)]
        emitter.on(...eventRecord)
        events.push(eventRecord)
      }
    }
    this.#pluginsEvents.set(name, events)
  }

  #detachEvents(plugin: GancioPlugin) {
    const { name } = plugin.manifest
    const events = this.#pluginsEvents.get(name) ?? []
    for (const [eventName, eventListener] of events) {
      emitter.off(eventName, eventListener)
    }
    this.#pluginsEvents.set(name, [])
  }

  getSettings(plugin: GancioPlugin): PluginSettings {
    const settingKey = PLUGIN_SETTINGS_PREFIX + plugin.manifest.name
    return (getSetting(settingKey) ?? {}) as PluginSettings
  }

  async setSettings(plugin: GancioPlugin, newSettings: PluginSettings, { allowEnable = false } = {}): Promise<void> {
    const finalSettings = {
      ...newSettings,
      enable: allowEnable ? newSettings.enable : this.getSettings(plugin)?.enable
    }
    const settingKey = PLUGIN_SETTINGS_PREFIX + plugin.manifest.name
    await setSetting(settingKey, finalSettings)
    plugin.settings = finalSettings
  }

  /**
   * import specified plugin, get its manifest and load it if enabled
   */
  async initPlugin(pluginPath: string, loadIfEnabled = true) {
    try {
      log.debug(`Initializing plugin in ${pluginPath}`)

      // import module
      const rawPlugin = await import(pluginPath)
      if (!rawPlugin?.default || typeof rawPlugin.default !== 'function') {
        log.warn(`Plugin at ${pluginPath} does not export a default function`)
        throw new Error(`Plugin at ${pluginPath} does not export a default function`)
      }
      const plugin: GancioPlugin = rawPlugin.default({
        log,
        publicSettings,
        db,
        services: {
          parseIcsData,
          TaskManager: useTaskManager(),
          findOrCreateTags,
          upsertEvent,
          getEvents,
          requireAdmin,
          requireRole,
          requireUser,
          getUser,
          isRole
        }
      })
      log.debug(`Imported plugin ${pluginPath}`)
      const pluginName = plugin?.manifest?.name
      if (!pluginName) {
        log.warn(`Plugin at ${pluginPath} has no name; skipping load`)
        throw new Error(`Plugin at ${pluginPath} has no name`)
      }

      // is this plugin already loaded?
      if (this.getPlugin(pluginName)) {
        log.warn(`Plugin ${pluginName} already loaded`)
        throw new Error(`Plugin ${pluginName} already loaded`)
      }

      // Register before load because a faulty configuration can make it fail
      // and it will never again apear in the UI to fix it.
      this.plugins.push(plugin)

      const pluginSettings = this.getSettings(plugin)
      if (loadIfEnabled && pluginSettings?.enable && typeof plugin.load === 'function') {
        plugin.settings = pluginSettings // make settings available to plugin instance
        await this.#enablePlugin(plugin)
      } else if (pluginSettings?.enable) {
        await this.setSettings(plugin, { ...pluginSettings, enable: false }, { allowEnable: true })
      }

      return plugin
    } catch (err) {
      log.warn(`Failed to load plugin at ${pluginPath}: ${String(err)}`)
      throw err
    }
  }

  getPlugin(name: string): GancioPlugin | undefined {
    return this.plugins.find(p => p.manifest.name === name)
  }

  /**
  * search for all installed plugins, load enabled ones
  */
  async initialize(loadIfEnabled = true) {
    // const config = getConfig()
    const pluginsPath = runtimeResolve('../plugins')

    log.debug(`Initializing plugins from: ${pluginsPath}`)

    const dirs = await fs.readdir(pluginsPath).catch(() => {
      log.warn(`Plugins path does not exist: ${pluginsPath}`)
      return []
    })

    return Promise.allSettled(dirs.map(async (d) => {
      const pluginPath = path.join(pluginsPath, d)

      // search for index.ts or index.js first to allow both file-based and folder-based plugins
      const indexTsPath = path.join(pluginPath, 'index.ts')
      const indexJsPath = path.join(pluginPath, 'index.js')
      if (existsSync(indexJsPath)) {
        return this.initPlugin(indexJsPath, loadIfEnabled)
      } else if (existsSync(indexTsPath)) {
        return this.initPlugin(indexTsPath, loadIfEnabled)
      } else if (existsSync(pluginPath) && (pluginPath.endsWith('.js') || pluginPath.endsWith('.ts'))) {
        return this.initPlugin(pluginPath, loadIfEnabled)
      } else {
        log.warn(`No valid entry point found for plugin in ${pluginPath}, skipping`)
        return Promise.reject(new Error(`No valid entry point found for plugin in ${pluginPath}`))
      }
    }))
  }

  async destroy() {
    await Promise.allSettled(this.plugins.map(plugin => this.disablePlugin(plugin)))
    this.plugins = []
  }
}
