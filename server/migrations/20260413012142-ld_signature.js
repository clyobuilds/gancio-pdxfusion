import { DataTypes } from '@sequelize/core'

export function up({ context: queryInterface }) {
  // new ld_signature
  return queryInterface.addColumn('events', 'ld_signature', { type: DataTypes.JSON })
}
