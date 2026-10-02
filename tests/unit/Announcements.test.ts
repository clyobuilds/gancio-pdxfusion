import { describe, expect, it, vi } from 'vitest'
import { mockH3Event } from './utils'
import { cleanDatabase } from '../api/setup'
import { getUser } from '../../server/lib/getUser'
import type { User } from '../../server/services/db'

vi.mock('../../server/lib/getUser')
const mockedGetUser = vi.mocked(getUser)

const { adminUser, userUser } = await cleanDatabase(true) as { adminUser: User, editorUser: User, userUser: User }

const { default: postAnnouncementHandler } = await import('../../server/api/announcements/index.post')
const { default: getAnnouncementsHandler } = await import('../../server/api/announcements/index.get')
const { default: putAnnouncementHandler } = await import('../../server/api/announcements/[id].put')
const { default: deleteAnnouncementHandler } = await import('../../server/api/announcements/[id].delete')

let announcementId: string

describe('Announcements', async () => {
  it('should not create a new announcement if not allowed', async () => {
    mockedGetUser.mockResolvedValueOnce(undefined)
    let event = mockH3Event({ body: { title: 'test' } })
    let response = postAnnouncementHandler(event)
    await expect(response).rejects.toHaveProperty('statusCode', 401)
    await expect(response).rejects.toHaveProperty('message', 'Unauthorized')

    mockedGetUser.mockResolvedValueOnce(userUser)
    event = mockH3Event({ body: { title: 'test' } })
    response = postAnnouncementHandler(event)
    await expect(response).rejects.toHaveProperty('statusCode', 401)
    await expect(response).rejects.toHaveProperty('message', 'Unauthorized')
  })

  it('should create a new announcement (hidden by default)', async () => {
    mockedGetUser.mockResolvedValueOnce(adminUser)
    let event = mockH3Event({ body: { title: 'test' } })
    let response = await postAnnouncementHandler(event)
    expect(response).toHaveProperty('id')
    expect(response).toHaveProperty('title', 'test')

    event = mockH3Event({})
    response = await getAnnouncementsHandler(event)
    expect(response).toHaveProperty('length', 0)
  })

  it('should create a new visible announcement', async () => {
    mockedGetUser.mockResolvedValueOnce(adminUser)
    let event = mockH3Event({ body: { title: 'test', visible: true } })
    let response = await postAnnouncementHandler(event)
    expect(response).toHaveProperty('id')
    expect(response).toHaveProperty('title', 'test')
    expect(response).toHaveProperty('visible', true)

    event = mockH3Event({})
    response = await getAnnouncementsHandler(event)
    expect(response).toHaveProperty('length', 1)
    announcementId = String(response[0].id)
  })

  it('should update an announcement if allowed', async () => {
    const event = mockH3Event({
      params: { id: announcementId },
      body: { title: 'updated', announcement: 'updated announcement' }
    })

    mockedGetUser.mockResolvedValueOnce(undefined)
    let response = putAnnouncementHandler(event)
    await expect(response).rejects.toHaveProperty('statusCode', 401)

    mockedGetUser.mockResolvedValueOnce(adminUser)
    response = await putAnnouncementHandler(event)
    expect(response).toHaveProperty('id')
    expect(response).toHaveProperty('title', 'updated')
    expect(response).toHaveProperty('announcement', 'updated announcement')
  })

  it('should delete an announcement if allowed', async () => {
    const event = mockH3Event({
      params: { id: announcementId }
    })
    mockedGetUser.mockResolvedValueOnce(undefined)
    let response = deleteAnnouncementHandler(event)
    await expect(response).rejects.toHaveProperty('statusCode', 401)

    mockedGetUser.mockResolvedValueOnce(adminUser)
    response = deleteAnnouncementHandler(event)
    await expect(response).resolves.toBeDefined()
  })
})
