import type { CreationAttributes } from '@sequelize/core'
import type { PostalAddress } from '~~/server/federation/types'
import type { Announcement, Event, Place, Recurrent } from '~~/server/services/db'

export type {
  User, Event, Tag, Place, APUser, Notification, Announcement,
  Message, Page, Filter, Collection, Media, Resource, Instance
} from '~~/server/services/db'

type ValidatorFn<T = unknown> = (value: T) => boolean | string

export interface ValidationService {
  required: (fieldName: string) => ValidatorFn
  requiredMulti: (fieldName: string) => ValidatorFn
  password: ValidatorFn<string>
  url: (required?: boolean) => ValidatorFn<string>
  email: ValidatorFn<string>[]
  latitude: ValidatorFn<number>[]
  longitude: ValidatorFn<number>[]
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $valid: ValidationService
  }
}

export type AnnouncementAPI = CreationAttributes<Announcement>

// front end place representation
export type PlaceAPI = CreationAttributes<Place>
  & { postal_address?: PostalAddress | null }
  & { eventCount?: number }

/**
 * there are two Event interface / type. The first one is named `Event` and its the db model,
 * this is the second one and describes how events are represented in API (and in the frontend)
 */
export type EventAPI = Omit<CreationAttributes<Event>, 'placeId' | 'is_visible'> & {
  tags?: string[]
  place?: PlaceAPI

  is_visible?: boolean

  /** true if the owner of the event is the current user */
  is_mine?: boolean

  /** true if the event does not have an author */
  is_anon?: boolean

  /** number of moderation messages **/
  n_msgs?: number

  /** original event's url (useful in case the event is coming from the federation) */
  original_url?: string

  /** plain text description */
  plain_description?: string

  media: Media[]

  recurrent?: Recurrent
  parent?: {
    id: number
    is_visible?: boolean
    start_datetime?: number
    recurrent?: Recurrent | null
  }

  ap_user?: {
    image: string
    name?: string
  }

  displayEndTime?: boolean
}
