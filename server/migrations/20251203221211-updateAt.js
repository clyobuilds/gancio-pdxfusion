import { DataTypes } from '@sequelize/core'

export function up({ context: queryInterface }) {
  return Promise.all(
    [
      queryInterface.addColumn('collections', 'updatedAt', { type: DataTypes.DATE, allowNull: true }),
      queryInterface.addColumn('collections', 'createdAt', { type: DataTypes.DATE, allowNull: true }),
    ])
}
