import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('tags',
    {
      tag: {
        type: DataTypes.STRING,
        allowNull: false,
        index: true,
        primaryKey: true
      },
      weigth: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
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
  return queryInterface.dropTable('tags')
}
