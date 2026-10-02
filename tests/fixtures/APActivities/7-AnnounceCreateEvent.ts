export default {
  type: 'Announce' as const,
  actor: 'http://localhost:13120/federation/u/relay',
  object: {
    type: 'Create' as const,
    actor: 'http://localhost:13120/federation/u/relay',
    object: {
      id: 'http://localhost:13120/federation/m/2',
      type: 'Event' as const,
      name: 'Announce > Create > Event',
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
}