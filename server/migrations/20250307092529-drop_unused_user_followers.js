export function up ({ context: queryInterface }) {
  return queryInterface.dropTable('user_followers')
}
