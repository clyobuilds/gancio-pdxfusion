import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('comments', 'apUserApId', {
    type: DataTypes.STRING,
    references: {
      table: 'fed_users',
      key: 'ap_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
}

export function down ({ context: queryInterface }) {
  return queryInterface.removeColumn('comments', 'apUserApId')
}
