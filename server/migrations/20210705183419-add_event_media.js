import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('events', 'media', { type: DataTypes.JSON })
}
