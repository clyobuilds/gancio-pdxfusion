import { defineEventHandler } from 'h3'
import { requireAdmin } from '~~/server/lib/auth'
// import { col, fn } from '@sequelize/core'
// import { APUser, Instance } from '~~/server/services'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

//   return APUser.findAll({
//     attributes: [
//       'domain',
//       'name',
//       'blocked',
//       [fn('COUNT', col('APUsers.ap_id')), 'users']
//     ],
//     order: [['users', 'DESC']],
//     group: ['domain'],
//     include: [
//       { model: APUser, attributes: [] }
//     ]
//   })
})
