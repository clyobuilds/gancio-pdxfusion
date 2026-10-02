export function up ({ context: queryInterface }) {
  return queryInterface.addIndex('notifications', {
    unique: true,
    fields: ['action', 'type']
  }).catch((e) => { console.warn(e) })
}

export function down ({ context: queryInterface }) {
  return queryInterface.removeIndex('notifications',
    ['actions', 'type'])
}
