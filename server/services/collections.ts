import { createError } from 'h3'
import type { WhereOptions } from '@sequelize/core'
import { Op, SQL_NULL, col, sql } from '@sequelize/core'
import { Event, Place, Filter, Collection, Tag } from './db'
import { DateTime } from 'luxon'
import z from 'zod'
import { publicSettings } from './settings'
import { useLogger } from '../lib/logger'
import { boolish } from './events'

export const collectionQuerySchema = z.object({
  name: z.string(),
  // defaults have to be evaluated at parse time: at load time settings are not loaded yet
  // (and could change later) and "now" would be when the server started
  start: z.coerce.number().optional().transform(v => v ?? DateTime.local().toUnixInteger()),
  end: z.coerce.number().optional(),
  show_recurrent: boolish.optional().transform(v => v ?? publicSettings.recurrent_event_visible),
  show_multidate: boolish.default(true),
  show_federated: boolish.default(false),
  limit: z.coerce.number().int().optional(),
  include_description: boolish.optional(),
  page: z.coerce.number().int().optional(),
  older: boolish.optional(),
  reverse: boolish.optional()
})
export type CollectionQueryType = z.infer<typeof collectionQuerySchema>

/**
 * Transform a Filter into a sequelize conditions + replacements
 * @param {Filter} filter
 * @returns
 * @link https://sequelize.org/docs/v7/querying/raw-queries/#replacements
 * @link https://sequelize.org/docs/v7/querying/select-in-depth/
 */
function filterToConditions(filter: Filter) {
  const conditions: WhereOptions<Event> = []
  const replacements: Record<string, unknown> = {}

  // mtch tags
  // if (filter?.tags?.length) {
  //   conditions.push({
  //     '$Tags.tag$': { [Op.in]: filter.tags }
  //   })
  // }

  if (filter.tags?.length) {
    conditions.push(sql`${col('Event.id')} IN (SELECT eventId FROM event_tags WHERE tagTag IN :tags_${filter.id})`)
    replacements[`tags_${filter.id}`] = sql.list(filter.tags)
  }

  if (filter.places?.length) {
    conditions.push({
      placeId: { [Op.in]: filter.places.map((p: Place) => p.id) }
    })
  }

  if (filter.actors?.length) {
    // search for local instance
    if (filter.actors.find(a => a.ap_id === null)) {
      conditions.push({ [Op.or]: [{ apUserApId: filter.actors.map(a => a.ap_id).filter(a => a) }, { apUserApId: null }] })
    } else {
      conditions.push({ apUserApId: filter.actors.map(a => a.ap_id) })
    }
  }

  return { conditions, replacements }
}

export async function getCollectionEvents(opts?: unknown): Promise<Event[]> {
  const log = useLogger('collections')
  const args = collectionQuerySchema.parse(opts)

  // get the collection from specified name
  const collection = await Collection.findOne({ where: { name: args.name }, raw: true })
  if (!collection) {
    log.warn(`"%s" not found`, args.name)
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  // and all related filters
  const filters = await Filter.findAll({ where: { collectionId: collection.id } })

  // collection is empty if there are no filters
  if (!filters.length) {
    log.debug('This collection has no filter!')
    return []
  }

  // init stardard filter
  const where: WhereOptions<Event> = {
    // do not include parent recurrent event
    recurrent: SQL_NULL,

    // confirmed event only
    is_visible: true,

    ...(args.start && {
      [Op.or]: [
        { start_datetime: { [args.older ? Op.lte : Op.gte]: args.start } },
        { end_datetime: { [args.older ? Op.lte : Op.gte]: args.start } },
        {
          end_datetime: SQL_NULL,
          start_datetime: { [args.older ? Op.lte : Op.gte]: args.start - publicSettings.open_ended_event_default_duration * 3600 } }
      ]
    }),

    ...(args.end && { start_datetime: { [args.older ? Op.gte : Op.lte]: args.end } }),

    // include recurrent events?
    ...(!args.show_recurrent && { parentId: null })
  }

  let replacements: Record<string, unknown> = {}
  const conditions: WhereOptions<Event> = []
  const negatedConditions: WhereOptions<Event> = []

  // collections are a set of filters to match
  filters.forEach((f) => {
    const { conditions: tmpConditions, replacements: tmpReplacements } = filterToConditions(f)
    replacements = { ...replacements, ...tmpReplacements }
    if (!tmpConditions.length) return
    if (f.negate) {
      negatedConditions.push(tmpConditions.length === 1 ? tmpConditions[0] : { [Op.and]: tmpConditions })
    } else {
      conditions.push(tmpConditions.length === 1 ? tmpConditions[0] : { [Op.and]: tmpConditions })
    }
  })

  if (negatedConditions.length) {
    where[Op.not] = negatedConditions
  }

  if (conditions.length) {
    where[Op.or] = conditions
  }

  return Event.findAll({
    where,
    attributes: {
      exclude: [
        'likes', 'boost', 'userId', 'createdAt',
        'placeId', 'ap_object', 'ap_id',
        ...(!args?.include_description ? ['description'] : [])
      ]
    },
    order: [['start_datetime', args?.reverse ? 'DESC' : 'ASC']],
    include: [
      {
        model: Tag,
        // order: [Sequelize.literal('(SELECT COUNT("tagTag") FROM event_tags WHERE tagTag = tag) DESC')],
        attributes: ['tag'],
        through: { attributes: [] }
      },
      { model: Place, required: false, attributes: ['id', 'name', 'address', 'latitude', 'longitude'] },
      { association: 'APUser', attributes: ['ap_id', 'object'] }
    ],
    ...(args?.limit && { limit: args.limit }),
    ...(args?.page && args.limit && { offset: args.page * args.limit }),
    replacements
  })
}
