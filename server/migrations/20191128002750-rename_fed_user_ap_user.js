export function up ({ context: queryInterface }) {
  return queryInterface.renameTable('fed_users', 'ap_users')
}

export function down ({ context: queryInterface }) {
  return queryInterface.renameTable('ap_users', 'fed_users')
}
