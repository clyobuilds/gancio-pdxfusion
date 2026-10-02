import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('oauth_tokens', {
    accessToken: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.STRING
    },
    accessTokenExpiresAt: DataTypes.DATE,
    refreshToken: DataTypes.STRING,
    refreshTokenExpiresAt: DataTypes.DATE,
    scope: DataTypes.STRING,
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
