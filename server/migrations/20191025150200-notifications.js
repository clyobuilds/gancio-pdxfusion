import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('notifications', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    filters: DataTypes.JSON,
    email: DataTypes.STRING,
    remove_code: DataTypes.STRING,
    action: {
      type: DataTypes.ENUM('Create', 'Update', 'Delete')
    },
    type: {
      type: DataTypes.ENUM('mail', 'admin_email', 'ap')
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
  return queryInterface.dropTable('notifications')
}
