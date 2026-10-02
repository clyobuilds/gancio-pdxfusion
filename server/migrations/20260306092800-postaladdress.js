import { DataTypes } from '@sequelize/core'

export function up({ context: queryInterface }) {
  return queryInterface.addColumn('places', 'postal_address',
    { type: DataTypes.JSON, allowNull: true })
  // as we have strings, let's convert to JSON strings:
  // const [rows] = await queryInterface.sequelize.query('SELECT id, address FROM places WHERE address IS NOT NULL')

  // for (const row of rows) {
  //   await queryInterface.sequelize.query('UPDATE places SET address = :address WHERE id = :id',
  //     {
  //       replacements: {
  //         id: row.id,
  //         address: JSON.stringify(row.address)
  //       }
  //     })
  // }

  // return queryInterface.changeColumn('places', 'address', {
  //   type: DataTypes.JSON,
  //   allowNull: true,
  // })
}
