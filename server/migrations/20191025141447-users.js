import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('users',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      username: {
        type: DataTypes.STRING,
        unique: { msg: 'error.nick_taken' },
        index: true,
        allowNull: false
      },
      display_name: DataTypes.STRING,
      settings: DataTypes.JSON,
      email: {
        type: DataTypes.STRING,
        unique: { msg: 'error.email_taken' },
        index: true,
        allowNull: false
      },
      description: DataTypes.TEXT,
      password: DataTypes.STRING,
      recover_code: DataTypes.STRING,
      is_admin: DataTypes.BOOLEAN,
      is_active: DataTypes.BOOLEAN,
      rsa: DataTypes.JSON,
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    }
  )
}

export function down ({ context: queryInterface }) {
  return queryInterface.dropTable('users')
}
