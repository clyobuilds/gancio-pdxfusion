import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('event_notifications', {
    status: {
      type: DataTypes.ENUM('new', 'sent', 'error', 'sending'),
      defaultValue: 'new',
      index: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    eventId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        table: 'events',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    notificationId: {
      primaryKey: true,
      type: DataTypes.INTEGER,
      references: {
        table: 'notifications',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  })
}

export function down ({ context: queryInterface }) {
  return queryInterface.dropTable('event_notifications')
}
