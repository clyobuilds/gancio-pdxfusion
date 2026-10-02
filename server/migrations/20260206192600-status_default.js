import { DataTypes } from '@sequelize/core'

export function up({ context: queryInterface }) {
  return queryInterface.sequelize.query('UPDATE events SET status = \'EventScheduled\' WHERE status IS NULL')
    .then(() => queryInterface.changeColumn('events', 'status', {
      type: DataTypes.ENUM([
        'EventCancelled', 'EventScheduled', 'EventTentative',
        'EventMovedOnline', 'EventPostponed', 'EventRescheduled']),
      defaultValue: 'EventScheduled',
      allowNull: false,
    }))
}
