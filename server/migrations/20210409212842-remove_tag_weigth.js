export function up ({ context: queryInterface }) {
  return queryInterface.removeColumn('tags', 'weigth')
}
