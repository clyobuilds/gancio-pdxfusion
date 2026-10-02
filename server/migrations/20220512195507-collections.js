import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('collections', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      index: true,
      allowNull: false
    },
    sortIndex: { type: DataTypes.INTEGER },
    isActor: {
      type: DataTypes.BOOLEAN
    },
    isTop: {
      type: DataTypes.BOOLEAN
    }
  })
}
