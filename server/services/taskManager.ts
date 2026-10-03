/**
 * Task manager
 *
 */

import { Duration } from 'luxon'
import { useLogger } from '../lib/logger'
import { cleanOrphanPlaces } from '../services/places'
import { cleanOrphanTags } from './tags'
import { cleanPastEvents, cleanUnusedAPActor } from './ap'
import { createRecurrent } from './recurrent'
const log = useLogger('Task Manager')

// seconds between two ticks of the task manager loop
const loopInterval = 60

// task delays are expressed in ticks, not in seconds
const minute = 60 / loopInterval
const hour = minute * 60
const day = hour * 24

// Singleton instance
let instance: TaskManager
export function useTaskManager() {
  if (!instance) {
    instance = new TaskManager()
  }
  return instance
}

export class Task {
  name: string
  method: () => Promise<undefined> | null
  args: unknown[]
  repeat: boolean
  retries?: number[]
  repeatDelay: number
  processInNTick: number

  constructor({ name = '', repeat = false, repeatDelay = 0, callAtStart = false, retries = [10, 50], method, args = [] }) {
    this.name = name
    this.method = method
    this.args = args

    this.repeat = repeat
    this.repeatDelay = repeatDelay
    this.processInNTick = callAtStart ? 1 : repeatDelay
    // retries on repeatable task only
    this.retries = repeat ? retries : []
  }

  handleError(e) {
    log.error(`TASK ERROR [${this?.name}]: ${e} ${e.stack}`)
    if (!this.repeat) {
      this.processInNTick = this.retries?.shift() ?? 0
      if (this.processInNTick) {
        log.info(`Error in ${this.name}: retring in `, Duration.fromMillis(this.processInNTick * 1000).rescale().toHuman({ listStyle: 'long' }))
      } else {
        log.info('This was the last try processing this task')
      }
    }
  }

  process() {
    this.processInNTick--
    if (this.processInNTick > 0) {
      return
    }
    log.info(`Process ${this.name}`)
    this.processInNTick = this.repeatDelay
    try {
      const ret = this.method.apply(this, this.args)
      if (ret && typeof ret.catch === 'function') {
        ret.catch(this.handleError.bind(this))
        return ret
      }
      return ret
    } catch (e) {
      log.error(e)
      this.handleError(e)
    }
  }
}

/**
 * Managed tasks:
 * - Send emails
 * - Send AP notifications
 * - Create recurrent events
 * - Sync AP federation profiles
 * - Remove unused tags/places
 * - Remove past federated events and related resources
 * - Remove unused ap actors
 */

export class TaskManager {
  tasks: Task[]
  interval: number
  timeout?: ReturnType<typeof setTimeout>

  constructor() {
    this.tasks = []
    this.interval = 1
  }

  start(interval = loopInterval) {
    // set the interval before adding tasks, as it is used to log their delay
    this.interval = interval

    // create and clean recurrent events
    this.add({
      name: 'CREATE_RECURRENT_EVENT',
      method: createRecurrent,
      repeatDelay: hour / 2, // check each half an hour
      repeat: true,
      callAtStart: true
    })

    this.add({
      name: 'CLEAN_UNUSED_PLACES',
      method: cleanOrphanPlaces,
      repeatDelay: day,
      repeat: true,
      callAtStart: true
    })

    this.add({
      name: 'CLEAN_UNUSED_TAGS',
      method: cleanOrphanTags,
      repeatDelay: day + 10 * minute,
      repeat: true,
      callAtStart: true
    })

    this.add({
      name: 'CLEAN_FEDIVERSE_PAST_EVENT',
      method: cleanPastEvents,
      repeatDelay: 12 * hour + 5 * minute,
      repeat: true,
      callAtStart: true
    })

    this.add({
      name: 'CLEAN_FEDIVERSE_AP_USERS',
      method: cleanUnusedAPActor,
      repeatDelay: day + 10 * minute,
      repeat: true,
      callAtStart: true
    })

    log.info(`START TASK MANAGER WITH LOOP INTERVAL OF ${interval} seconds`)
    this.timeout = setTimeout(this.tick.bind(this), interval * 1000)
  }

  stop() {
    if (this.timeout) {
      log.info('STOP TASKMANAGER')
      clearTimeout(this.timeout)
      this.timeout = undefined
    }
  }

  add({ name = '', repeat = false, repeatDelay = 0, callAtStart = false, retries = [20, 50], method, args = [] }) {
    const safeRepeatDelay = Math.max(Number(repeatDelay) || 0, 0)
    if (repeat) {
      log.info(`[TASK] Add ${name} (each ${Duration.fromMillis(safeRepeatDelay * this.interval * 1000).rescale().toHuman({ listStyle: 'long' })})`)
    } else {
      log.info(`[TASK] Add ${name}`)
    }
    const task = new Task({ name, repeat, repeatDelay: safeRepeatDelay, callAtStart, retries, method, args })
    this.tasks.push(task)
  }

  remove(name: string) {
    log.info(`[TASK] Remove ${name}`)
    this.tasks = this.tasks.filter(task => task.name !== name)
  }

  process() {
    if (!this.tasks.length) {
      return
    }

    // process all tasks
    const tasks = this.tasks.map(t => t.process())

    // only keep tasks that are either repeating or have retries left
    // completed tasks are removed from the queue
    this.tasks = this.tasks.filter(t => t.repeat || (t.retries?.length && t.processInNTick > 0))

    return Promise.allSettled(tasks)
  }

  async tick() {
    await this.process()
    this.timeout = setTimeout(this.tick.bind(this), this.interval * 1000)
  }
}

// daily morning notification
// TS.add(new Task({
//   name: 'NOTIFICATION',
//   method: notifier._daily,
//   repeatEach: 1
// }))

// AP users profile sync
// TaskManager.add(new Task({
//   name: 'AP_PROFILE_SYNC',
//   method: federation._sync,
//   repeatEach: 60 * 24
// }))

// Search for places position via nominatim
// TaskManager.add(new Task({
//   name: 'NOMINATIM_QUERY',
//   method: places._nominatimQuery,
//   repeatEach: 60
// }))
//

// TS.start()
// TS.add(new Task({ name: 'removable #1', method: daje, args: ['removable #1'], removable: true }))
// TS.add(new Task({ name: 'non removable #2', method: daje, args: ['non removable #2'] }))
// TS.add(new Task({ name: 'non removable and repeat each #2', method: daje, args: ['nn rm and rpt #5'], repeatEach: 5 }))
