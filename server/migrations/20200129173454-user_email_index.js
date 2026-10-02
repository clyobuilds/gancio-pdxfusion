export function up ({ context: queryInterface }) {
  return queryInterface.addIndex('users', {
    unique: true,
    fields: ['email']
  })
}
