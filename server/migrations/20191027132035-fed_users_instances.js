import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.addColumn('fed_users', 'instanceDomain', {
    type: DataTypes.STRING,
    references: {
      table: 'instances',
      key: 'domain'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
}

export function down ({ context: queryInterface }) {
  return queryInterface.removeColumn('fed_users', 'instanceDomain')
}
