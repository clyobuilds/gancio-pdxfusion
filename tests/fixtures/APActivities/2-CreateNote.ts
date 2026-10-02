export default {
  type: 'Create',
  actor: 'http://localhost:13120/federation/u/relay',
  object: {
    inReplyTo: 'http://localhost:13120/federation/m/1',
    id: 'http://localhost:13120/federation/u/relay/note/1',
    type: 'Note',
    name: 'Create > Note',
    content: 'This is a note'
  }
}