export function up ({ context: queryInterface }) {
  return queryInterface.bulkInsert('oauth_clients', [{
    id: 'self',
    name: 'self',
    scopes: 'all',
    createdAt: new Date(),
    updatedAt: new Date()
  }])
}