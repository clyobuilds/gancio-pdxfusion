import { getQuery, getRouterParams, type H3Event } from 'h3'
import type { GancioContext, GancioPlugin } from '../../server/services/plugins'
import type { PluginSettings } from '../../shared/types/settings'

// define your plugin settings type
type ExampleSettings = PluginSettings & {
  my_plugin_string_setting: string
  enable_this_feature_in_my_plugin: boolean
  min_post: number
  my_default_language: string
}

/**
 * An example plugin to show how to create a plugin for Gancio
 */
// export default ({ log, db, publicSettings, services }: GancioContext): GancioPlugin => ({
export default ({ log, publicSettings, services }: GancioContext): GancioPlugin => ({
  settings: {} as ExampleSettings,
  manifest: {
    name: 'Example',
    author: 'lesion',
    url: 'https://framagit.org/les/gancio',
    version: '2.0',
    description: 'An example plugin to show how to create a plugin for Gancio',
    // define your plugin settings schema, this will be used to generate the settings form in the admin panel
    settings: {
      my_plugin_string_setting: {
        type: 'TEXT',
        description: 'Plain text setting',
        hint: 'The hint supports <strong>html too</strong>',
        required: true
      },
      enable_this_feature_in_my_plugin: {
        type: 'CHECK',
        description: 'Boolean setting',
        hint: 'This feature is super dupe, enable it!'
      },
      min_post: {
        type: 'NUMBER',
        description: 'Numeric setting',
        min: 0, // Optional
        max: 10 // Optional
      },
      my_default_language: {
        description: 'Choices setting',
        hint: 'Allow selecting only from a closed list. A default value can be defined.',
        type: 'LIST',
        items: ['it', 'en', 'fr'],
        default: publicSettings?.instance_locale ?? 'en'
      },
      url_setting: {
        type: 'URL',
        description: 'URL setting',
        hint: 'The interface will validate this value is a well formed URL',
        required: true
      },
    }
  },

  // when the plugin is enabled, this function is called, you can do some initialization here like
  // starting a Task with services.TaskManager or setting up some data in db, initialize external API connection, etc...
  // settings are available with this.settings, they are automatically updated when the settings are changed in the admin panel
  load() {
    // log debug message and access plugin settings
    log.debug('Example plugin loaded with settings:', this.settings)

    // access to gancio settings
    log.info(`This instance url is ${publicSettings.baseurl}`)

    // add a task to the task manager
    services.TaskManager.add({
      name: 'Plugin:Example',
      repeat: true,
      repeatDelay: Number(this.settings?.refresh_minutes),
      method: async () => {
        log.info('Plugin:Example task')
      }
    })
  },
  // this function can be called from the admin panel to test the plugin without enabling it,
  // useful for example if you want to test the connection to an external API with the provided settings before enabling the plugin
  onTest(settings: ExampleSettings) {
    log.debug('Example plugin onTest called with settings:', settings)
  },
  // these functions are called when an event is created, deleted or updated in Gancio,
  // you can use them to do some custom actions like sending a notification to an external service, etc...
  onEventCreate(event) {
    log.debug('Example plugin onEventCreate called with event:', event)
  },
  onEventDelete(event) {
    log.debug('Example plugin onEventDelete called with event:', event)
  },
  onEventUpdate(event) {
    log.debug('Example plugin onEventUpdate called with event:', event)
  },
  // called when the plugin is disabled, you can do some cleanup here like stopping a Task with services.TaskManager
  unload() {
    log.debug('Example plugin unloaded')
  },
  onCLI(args: string[]) {
    log.debug('Example plugin onCLI called with args:', args)
  },
  routeAPI(evt: H3Event) {
    log.debug('Example plugin routeAPI called with event:')
    return {
      message: 'Hello from example plugin API route!',
      query: getQuery(evt),
      params: getRouterParams(evt)
    }
  }
})
