import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('comments',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      activitypub_id: {
        type: DataTypes.STRING(18),
        index: true,
        unique: true
      },
      eventId: {
        type: DataTypes.INTEGER,
        references: {
          table: 'events',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      data: DataTypes.JSON,
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
  return queryInterface.dropTable('comments')
}
