import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('events', 'ap_object', { type: DataTypes.JSON })
}