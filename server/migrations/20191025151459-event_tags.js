import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('event_tags', {
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
    tagTag: {
      primaryKey: true,
      type: DataTypes.STRING,
      references: {
        table: 'tags',
        key: 'tag'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  })
}

export function down ({ context: queryInterface }) {
  return queryInterface.dropTable('event_tags')
}
