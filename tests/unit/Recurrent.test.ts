import { describe, expect, it, vi } from 'vitest'
import { cleanDatabase } from '../api/setup'
import { mockH3Event, now } from './utils'
import { Event, getEvents, setSetting } from '../../server/services'
// import { getUser } from '../../server/lib/getUser'
import { createRecurrentOccurrence } from '../../server/services/recurrent'

vi.mock('../../server/lib/getUser')
// const mockedGetUser = vi.mocked(getUser)

await cleanDatabase(true)
// let event_id: number

const { default: handleEvent } = await import('../../server/api/events/index.post')
// const { default: patchHandler } = await import('../../server/api/events/[id]/index.patch')
// const { default: toggleHandler } = await import('../../server/api/events/[id]/toggle.put')

describe('Recurrent Events', () => {
  it('should not create a recurrent event when disabled', async () => {
    await setSetting('allow_recurrent_event', false)
    const event = mockH3Event({
      method: 'POST',
      body: {
        title: 'test title', place_name: 'place name',
        place_address: 'address', tags: ['test'], start_datetime: now() + 1000,
        recurrent: JSON.stringify({ frequency: '1w', type: 'ordinal' })
      }
    })
    const response = handleEvent(event)
    await expect(response).rejects.toHaveProperty('statusCode', 400)
    await expect(response).rejects.toHaveProperty('message', 'Recurrent event update/creation not allowed')
  })

  it('should create a recurrent event when allowed', async () => {
    await setSetting('allow_recurrent_event', true)
    const event = mockH3Event({
      method: 'POST',
      body: {
        title: 'test title', place_name: 'place name',
        place_address: 'address', tags: ['test'], start_datetime: now() + 1000,
        recurrent: JSON.stringify({ frequency: '1w', type: 'ordinal' })
      }
    })
    const response = await handleEvent(event)
    expect(response).toHaveProperty('id')
  })

  it('should check the show_recurrent settings in que', async () => {
    const event = await Event.create({
      title: 'test second title',
      is_visible: true,
      start_datetime: now() + 1000,
      recurrent: { frequency: '1w', type: 'ordinal' }
    })

    const occurrence = await createRecurrentOccurrence(event)
    expect(occurrence).toHaveProperty('id')

    // check getEvents
    let events = await getEvents({ show_recurrent: true })
    expect(events).toHaveLength(1)

    events = await getEvents({ show_recurrent: false })
    expect(events).toHaveLength(0)
  })
})
