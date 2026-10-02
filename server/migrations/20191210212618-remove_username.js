export function up ({ context: queryInterface }) {
  return queryInterface.removeColumn('users', 'username')
}