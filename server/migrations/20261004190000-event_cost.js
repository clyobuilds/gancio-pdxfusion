import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('events', 'cost', { type: DataTypes.STRING })
}
