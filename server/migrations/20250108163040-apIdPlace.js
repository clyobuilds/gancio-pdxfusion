import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('places', 'ap_id', { type: DataTypes.STRING, index: true })
}
