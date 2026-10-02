import mitt from 'mitt'
import type { Settings } from '~~/shared/types/settings'
import type { EventAPI } from '~~/shared/types/generic'

export type EventType = {
  'settings:updated': { key: keyof Settings, value: unknown }
  'event:Create': EventAPI
  'event:Update': EventAPI
  'event:Delete': EventAPI
}

const emitter = mitt<EventType>()
export default emitter