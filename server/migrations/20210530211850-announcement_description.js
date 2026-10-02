import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.changeColumn('announcements', 'announcement', {
    type: DataTypes.TEXT
  })
}
