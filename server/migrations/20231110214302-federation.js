import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return Promise.all(
    [
      queryInterface.addColumn('ap_users', 'trusted', { type: DataTypes.BOOLEAN }),
      queryInterface.addColumn('instances', 'applicationActor', { type: DataTypes.STRING }),
      queryInterface.addColumn('ap_users', 'following', { type: DataTypes.BOOLEAN }),
      queryInterface.addColumn('filters', 'actors', { type: DataTypes.JSON }),
      queryInterface.addColumn('events', 'ap_id', { type: DataTypes.STRING, index: true }),
      queryInterface.addColumn('events', 'apUserApId', {
        type: DataTypes.STRING,
        references: {
          table: 'ap_users',
          key: 'ap_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }),
    ]
  )
}
