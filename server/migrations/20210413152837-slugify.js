import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.changeColumn('events', 'slug', {
    type: DataTypes.STRING,
    index: true,
    unique: true
  })
}