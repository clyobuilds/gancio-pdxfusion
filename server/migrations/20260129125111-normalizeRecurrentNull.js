export function up({ context: queryInterface }) {
  const dialect = queryInterface.sequelize.dialect.name

  let castType = 'CHAR'
  if (dialect === 'postgres') castType = 'TEXT'

  return queryInterface.sequelize.query(`
    UPDATE events
    SET recurrent = NULL
    WHERE recurrent IS NULL
       OR CAST(recurrent AS ${castType}) = 'null'
       OR CAST(recurrent AS ${castType}) = '"null"'
  `)
}
