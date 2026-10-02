import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('settings', {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      index: true
    },
    value: DataTypes.JSON,
    is_secret: DataTypes.BOOLEAN,
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
  return queryInterface.dropTable('settings')
}
