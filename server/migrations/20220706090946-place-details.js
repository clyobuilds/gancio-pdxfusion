import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return Promise.all(
    [
      queryInterface.addColumn('places', 'latitude', { type: DataTypes.DOUBLE }),
      queryInterface.addColumn('places', 'longitude', { type: DataTypes.DOUBLE }),
    ]
  )
}
