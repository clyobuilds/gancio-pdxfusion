import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('fed_users', 'follower', {
    type: DataTypes.BOOLEAN
  })
}

export function down ({ context: queryInterface }) {
  return queryInterface.removeColumn('fed_users', 'follower')
}
