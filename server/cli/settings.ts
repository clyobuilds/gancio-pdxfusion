import { connect } from '../services/db'
import { loadSettings, setSetting } from '../services/settings'

async function get(args) {
  const db = await connect()
  const settings = await loadSettings()
  console.log()
  if (!Object.keys(settings).includes(args.setting)) {
    console.error(`Setting "${args.setting}" does not exists`)
  } else {
    console.log(`${args.setting}: ${JSON.stringify(settings[args.setting])}`)
  }
  console.log()
  return db.close()
}

async function set(args) {
  const db = await connect()
  const settings = await loadSettings()
  console.log()
  if (!Object.keys(settings).includes(args.setting)) {
    console.error(`Setting "${args.setting}" does not exists`)
  } else {
    console.log(args.setting)
    console.log(`Old value: ${JSON.stringify(settings[args.setting])}`)
    console.warn(`New value: ${args.value}`)
    if (args.setting === 'instance_name') {
      console.error('\nNote that this will likely break current federation (all your follower / following connections will be destroyed)!')
    }
    console.error('\nNote that a restart is needed to get the new setting')
    await setSetting(args.setting, JSON.parse(args.value))
  }
  console.log()
  await db.close()
}

async function list() {
  const db = await connect()
  const settings = await loadSettings()
  console.log()

  for (const [key, value] of Object.entries(settings)) {
    console.log(`${key}: ${JSON.stringify(value)}`)
  }
  console.log()
  await db.close()
}

const settingsCLI = yargs => yargs
  .command('list', 'List all settings', list)
  .command('get <setting>', 'Get value of specified setting', {}, get)
  .command('set <setting> <value>', 'Set value of specified setting', {}, set)
  .recommendCommands()
  .demandCommand(1, '')

export default settingsCLI
