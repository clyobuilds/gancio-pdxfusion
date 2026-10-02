import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('user_followers', {
    userId: {
      type: DataTypes.INTEGER,
      references: {
        table: 'users',
        key: 'id'
      },
      primaryKey: true,
      allowNull: false,
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    fedUserApId: {
      primaryKey: true,
      type: DataTypes.STRING,
      references: {
        table: 'fed_users',
        key: 'ap_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  })
}

export function down ({ context: queryInterface }) {
  return queryInterface.dropTable('user_followers')
}
