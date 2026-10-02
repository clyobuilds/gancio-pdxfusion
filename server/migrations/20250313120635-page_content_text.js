import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.changeColumn('pages', 'content', {
    type: DataTypes.TEXT
  })
}
