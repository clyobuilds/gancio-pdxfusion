import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('filters', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    collectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        table: 'collections',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    tags: {
      type: DataTypes.JSON,
    },
    places: {
      type: DataTypes.JSON,
    }
  })
}
