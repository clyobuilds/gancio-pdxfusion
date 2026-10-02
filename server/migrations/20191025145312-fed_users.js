import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('fed_users', {
    ap_id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    object: {
      type: DataTypes.JSON
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  })
}

export function down ({ context: queryInterface }) {
  return queryInterface.dropTable('fed_users')
}
