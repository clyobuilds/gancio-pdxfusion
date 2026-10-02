export function up ({ context: queryInterface }) {
  return queryInterface.renameTable('comments', 'resources')
}

export function down ({ context: queryInterface }) {
  return queryInterface.renameTable('resources', 'comments')
}
