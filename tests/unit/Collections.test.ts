import { beforeAll, describe, expect, it, vi } from 'vitest'
import { mockH3Event, now } from './utils'
import { cleanDatabase } from '../api/setup'
import { getUser } from '../../server/lib/getUser'

vi.mock('../../server/lib/getUser')
const mockedGetUser = vi.mocked(getUser)

const collections = []
const filters = []
const { adminUser, editorUser, userUser } = await cleanDatabase(true)

const { default: postCollectionHandler } = await import('../../server/api/collections/index.post')
const { default: getCollections } = await import('../../server/api/collections/[id].get')

describe('Collection', async () => {
  it('should not create a new collection if not allowed', async () => {
    mockedGetUser.mockResolvedValueOnce(undefined)
    const event = mockH3Event({ body: { name: 'test' } })
    const response = postCollectionHandler(event)
    await expect(response).rejects.toHaveProperty('statusCode', 401)
    await expect(response).rejects.toHaveProperty('message', 'Unauthorized')
  })

  it('should create a new collection', async () => {
    mockedGetUser.mockResolvedValueOnce(adminUser)
    const event = mockH3Event({ body: { name: 'test' } })
    const response = await postCollectionHandler(event)
    expect(response).toHaveProperty('id')
    expect(response).toHaveProperty('name', 'test')
    collections.push(response)
  })

  it('should not have any event when no filters', async () => {
    const event = mockH3Event({ params: { id: 'test' } })
    const events = await getCollections(event)
    expect(events).toEqual([])
  })

  //   it('should add a new filter (tag: test) only when allowed', async () => {
  //     let response = await fetchWithAuth('/api/filters', 'POST', { collectionId: collections[0].id, tags: ['test'] }, 'none')
  //     expect(response.status).toBe(401)

  //     response = await fetchWithAuth('/api/filters', 'POST', { collectionId: collections[0].id, tags: ['test'] })

  //     expect(response.status).toBe(200)

  //     expect(response.data.id).toBeDefined()
  //     filters.push(response.data.id)
  //   })

  //   it('shoud get collection\'s filters using withFilters parameter', async () => {
  //     let response = await fetchWithAuth('/api/collections?withFilters=true')

  //     expect(response.status).toBe(200)
  //     expect(response.data.length).toBe(1)
  //     expect(response.data[0].name).toBe('test')
  //     expect(response.data[0].filters.length).toBe(1)
  //     expect(response.data[0].filters[0].tags.length).toBe(1)
  //     expect(response.data[0].filters[0].tags[0]).toBe('test')

  //     response = await fetchWithAuth('/api/collections')
  //     expect(response.status).toBe(200)
  //     expect(response.data[0]?.filters).toBeUndefined()

  //     response = await fetchWithAuth('/api/collections?withFilters=false')
  //     expect(response.status).toBe(200)
  //     expect(response.data[0]?.filters).toBeUndefined()
  //   })

  //   it('should get collection events', async () => {
  //     const response = await fetch(`/api/collections/test`)
  //     expect(response.status).toBe(200)

  //     // expect(await response.json()).toBe(1)
  //   })

  //   // it('should remove filter', async () => {
  //   //   await request(app)
  //   //     .delete(`/api/filter/${filters[0]}`)
  //   //     .expect(403)

  //   // await request(app)
  //   //   .delete(`/api/filter/${filters[0]}`)
  //   //   .auth(token.access_token, { type: 'bearer' })
  //   //   .expect(200)

  //   // const response = await request(app)
  //   //   .get(`/api/filter/${filters[0]}`)
  //   //   .auth(token.access_token, { type: 'bearer' })
  //   //   .expect(200)

  //   //   expect(response.body.length).toBe(0)
  //   // })

  //   // it('shoud filter for tags', async () => {
  //   //
  //   // })
  //   //

  //   it('should create a second collection', async () => {
  //     let response = await fetchWithAuth('/api/collections', 'POST', { name: 'second collection' })
  //     expect(response.status).toBe(200)
  //     expect(response.data.id).toBeDefined()
  //     collections.push(response.data)

  //     response = await fetchWithAuth('/api/collections')
  //     expect(response.status).toBe(200)
  //     expect(response.data?.length).toBe(2)
  //     expect(response.data[0].id).toBe(collections[0].id)
  //     expect(response.data[1].id).toBe(collections[1].id)
  //   })

  //   it('should change collections order', async () => {
  //     let response = await fetchWithAuth(`/api/collections/moveup/${collections[1].sortIndex}`, 'PUT')
  //     expect(response.status).toBe(200)

  //     response = await fetchWithAuth('/api/collections')
  //     expect(response.status).toBe(200)
  //     expect(response.data?.length).toBe(2)
  //     expect(response.data[0].id).toBe(collections[1].id)
  //     expect(response.data[1].id).toBe(collections[0].id)
  //   })

//   it('should remove collection', async () => {
//     let response = await fetchWithAuth(`/api/collections/${collections[0].id}`, 'DELETE')
//     expect(response.status).toBe(200)
//     response = await fetchWithAuth(`/api/collections/${collections[1].id}`, 'DELETE')
//     expect(response.status).toBe(200)
//   })
})
