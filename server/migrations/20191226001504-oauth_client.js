import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('oauth_clients', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.STRING
    },
    name: DataTypes.STRING,
    client_secret: DataTypes.STRING,
    scopes: DataTypes.STRING,
    redirectUris: DataTypes.STRING,
    website: DataTypes.STRING,
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  })
}
