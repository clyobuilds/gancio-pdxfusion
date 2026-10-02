import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('oauth_codes', {
    authorizationCode: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    expiresAt: DataTypes.DATE,
    scope: DataTypes.STRING,
    redirect_uri: DataTypes.STRING,
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
    clientId: {
      type: DataTypes.STRING,
      references: {
        table: 'oauth_clients',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        table: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  })
}
