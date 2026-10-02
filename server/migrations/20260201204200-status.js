import { DataTypes } from '@sequelize/core'

export function up({ context: queryInterface }) {
  return queryInterface.addColumn('events', 'status', {
    type: DataTypes.ENUM([
      'EventCancelled', 'EventScheduled', 'EventTentative',
      'EventMovedOnline', 'EventPostponed', 'EventRescheduled',
    ]),
    default: 'EventScheduled',
  })
}
