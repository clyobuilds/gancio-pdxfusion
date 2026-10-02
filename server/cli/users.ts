import { connect, User } from '../services/db'
import { useLogger } from '../lib/logger'

const log = useLogger('CLI')

async function setRole(args) {
  const db = await connect()
  const user = await User.findOne({ where: { email: args.email } })
  console.log()
  if (!user) {
    console.error(`User ${args.email} not found`)
    return db.close()
  }

  user.role = args.role
  await user.save()
  console.log(`User ${user.email} role is now ${user.role}!`)
  return db.close()
}

async function remove (args) {
  const ret = await log.prompt(`Are you sure to remove the user ${args.email}?`, { type: 'confirm' })
  if (!ret) return
  const db = await connect()
  const user = await User.findOne({ where: { email: args.email } })
  if (user) {
    await user.destroy()
    console.error(`User "${args.email}" succesfully removed`)
  } else {
    console.error(`User "${args.email}" not found!`)
  }
  await db.close()
}

async function list() {
  const db = await connect()
  const users = await User.findAll()
  users.forEach(u => console.log(`${u.id}\trole: ${u.role}\tenabled: ${u.is_active}\temail: ${u.email}`))
  await db.close()
}

async function resetPassword(args: { email: string, password?: string }) {
  const db = await connect()
  const user = await User.findOne({ where: { email: args.email } })
  console.log()
  if (!user) {
    console.error(`User ${args.email} not found`)
    return db.close()
  }

  // if not password is specified ask user for it
  // TODO: wait for this https://github.com/unjs/consola/issues/285
  if (!args.password) {
    args.password = await log.prompt(`Enter new password for user ${args.email}:`, { type: 'text' })
  }

  if (args.password) {
    user.password = args.password
    await user.save()
    log.box(`New password for user ${user.email} is '${args.password}'`)
  } else {
    log.box(`Password cannot be empty`)
  }

  return db.close()
}

async function create (args) {
  const db = await connect()
  try {
    const user = await User.create({
      email: args.email,
      password: args.password,
      is_active: true,
      role: args.role || 'user'
    })
    console.error(`User "${args.email}" created with role ${user.role}`)
  } catch(e) {
    console.error(String(e))
  }
  return db.close()
}

async function enable (args: { email: string }, enable: boolean) {
  const db = await connect()
  const user = await User.findOne({ where: { email: args.email } })
  console.log()
  if (!user) {
    console.error(`User ${args.email} not found`)
    await db.close()
    return
  }

  if (user.is_active === enable) {
    console.warn(`User ${args.email} is already ${enable ? 'enabled' : 'disabled'}!`)
    await db.close()
    return
  }

  user.is_active = enable
  await user.save()
  console.info(`User ${user.email} is now ${enable ? 'enabled' : 'disabled'}!`)
  await db.close()
}

const usersCLI = yargs => yargs
  .command('list', 'List all users', list)
  .command('set-role <email> <role>', 'Set specified role privileges to the given user',
    { role: { describe: 'Define this user role', choices: ['user', 'admin', 'editor'] } }, setRole)
  .command('enable <email>', 'Enable an user', {}, args => enable(args, true))
  .command('disable <email>', 'Enable an user', {}, args => enable(args, false))
  .command('reset-password <email> [password]', 'Resets the password of the given user', {
  }, resetPassword)
  .command('create <email> [password] [role]', 'Create an user (role could be `user`, `admin` or `editor`)',
    { role: { describe: 'Define this user role', choices: ['user', 'admin', 'editor'] } }, create)
  .command('remove <email>', 'Remove an user', {}, remove)
  .strict()
  .demandCommand(1, '')
  .recommendCommands()

export default usersCLI