export default {
  type: 'Update',
  actor: 'http://localhost:13120/federation/u/relay',
  object: {
    id: 'http://localhost:13120/federation/m/1',
    type: 'Event',
    name: 'Update > Event',
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