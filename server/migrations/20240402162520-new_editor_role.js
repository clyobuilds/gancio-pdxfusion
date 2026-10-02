import { DataTypes } from '@sequelize/core'

export function up({ context: queryInterface }) {
  return queryInterface.addColumn('users', 'role', {
    type: DataTypes.ENUM(['admin', 'editor', 'user']),
    defaultValue: 'user'
  })
}
