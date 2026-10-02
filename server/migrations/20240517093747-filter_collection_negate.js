import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('filters', 'negate', { type: DataTypes.BOOLEAN })
}
