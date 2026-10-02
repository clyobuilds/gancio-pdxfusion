import { DataTypes } from '@sequelize/core'

/**
 * Remove unused username column from users table.
 *
 * queryInterface.removeColumn() does not work on MariaDB due to
 * https://github.com/sequelize/sequelize/issues/6980. Use
 * queryGenerator + sequelize.query() instead.
 * Only runs on mariadb dialect; other dialects removed it via
 * the older migration (20191210212618-remove_username.js).
 */
export function up ({ context: queryInterface }) {
  const dialect = queryInterface.sequelize.dialect.name
  if (dialect === 'mariadb') {
    const sql = queryInterface.queryGenerator.removeColumnQuery('users', 'username')
    return queryInterface.sequelize.query(sql)
  }
}

export function down ({ context: queryInterface }) {
  return queryInterface.addColumn('users', 'username', {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  })
}
