import { connect } from '../services/db'
import { pluginController } from '../services'

async function list() {
  const db = await connect()
  const plugins = await pluginController.initialize(false).catch(err => {
    console.error('Error initializing plugins:', err)
    return []
  })
  console.log()
  // also filter out rejected plugins
  for (const pluginResult of plugins) {
    if (pluginResult.status === 'rejected') {
      console.error(`Failed to load plugin: ${String(pluginResult.reason)}`)
      continue
    }
    const plugin = pluginResult.value
    if (!plugin) continue
    console.log(`[${plugin.manifest.name}]\r\n > ${plugin.manifest.description}`)
  }
  console.log()
  await db.close()
}

async function cli(args) {
  const db = await connect()
  await pluginController.initialize(false).catch(err => {
    console.error('Error initializing plugins:', err)
    return []
  })

  await pluginController.runCLI(args.name, args.args)
  await db.close()
}

const pluginsCLI = yargs => yargs
  .command('list', 'List all plugins', list)
  .command('command <name> <args..>', 'Run a plugin command', {}, cli)
  // .command('enable <name>', 'Enable a plugin', {}, enable)
  // .command('disable <name>', 'Disable a plugin', {}, disable)
  .recommendCommands()
  .demandCommand(1, '')

export default pluginsCLI
