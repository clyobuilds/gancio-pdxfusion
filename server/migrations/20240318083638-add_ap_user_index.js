export function up ({ context: queryInterface }) {
  return queryInterface.addIndex('ap_users', ['trusted'])
}
