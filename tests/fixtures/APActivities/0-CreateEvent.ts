export default {
  '@context': 'https://www.w3.org/ns/activitystreams',
  'type': 'Create',
  'to': ['https://example.com/user1', 'https://example.com/user2'],
  'cc': 'https://example.com/user3',
  'actor': 'http://localhost:13120/federation/u/relay',
  'object': {
    id: 'http://localhost:13120/federation/m/1',
    type: 'Event',
    name: 'Create > Event',
    startTime: '2023-01-01T12:00:00Z',
    endTime: '2023-01-01T13:00:00Z',
    location: {
      type: 'Place',
      name: 'My Location',
      latitude: 37.7749,
      longitude: -122.4194
    }
  }
}