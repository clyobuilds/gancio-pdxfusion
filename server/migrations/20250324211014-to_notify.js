import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('users', 'to_notify', { type: DataTypes.BOOLEAN })
}
