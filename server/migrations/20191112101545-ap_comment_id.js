import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.changeColumn('comments', 'activitypub_id', {
    type: DataTypes.STRING,
    index: true,
    unique: true
  })
}

export function down ({ context: queryInterface }) {
  return queryInterface.changeColumn('comments', 'activitypub_id', {
    type: DataTypes.STRING(18),
    index: true,
    unique: true
  })
}
