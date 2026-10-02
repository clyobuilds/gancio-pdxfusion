import { defineEventHandler } from 'h3'
import { Event, publicSettings, Resource, User } from '~~/server/services'
import { useRuntimeConfig } from 'nitropack/runtime'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const nodeinfo_version = event.context.params?.nodeinfo_version ?? '2.0'

  const usersCount = (await User.findAndCountAll()).count
  const eventsCount = (await Event.findAndCountAll()).count
  const resourcesCount = (await Resource.findAndCountAll()).count

  return {
    metadata: {
      nodeDescription: publicSettings.description,
      nodeName: publicSettings.title,
      nodeTimezone: publicSettings.instance_timezone,
      nodeActor: publicSettings.instance_name
    },
    openRegistrations: publicSettings.allow_registration,
    protocols: ['activitypub'],
    services: { inbound: [], outbound: ['rss2.0'] },
    software: {
      name: 'gancio',
      version: config.public.version,
      ...(nodeinfo_version === '2.1' && { repository: 'https://framagit.org/les/gancio' })
    },
    version: event.context?.params?.nodeinfo_version ?? '2.1',
    usage: {
      localComments: resourcesCount,
      localPosts: eventsCount,
      users: {
        total: usersCount
      }
    }
  }
})
