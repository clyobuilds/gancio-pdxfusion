import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return Promise.all([
    queryInterface.dropTable('event_notifications'),
    queryInterface.createTable('tasks', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(['new', 'sent', 'error', 'sending']),
        defaultValue: 'new',
        index: true
      },
      error: {
        type: DataTypes.TEXT
      },
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          table: 'events',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      notificationId: {
        allowNull: true,
        type: DataTypes.INTEGER,
        references: {
          table: 'notifications',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    }),
  ])
}
