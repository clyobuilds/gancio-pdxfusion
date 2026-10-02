import { Op, col, where, fn } from '@sequelize/core'
import { useLogger } from '../lib/logger'
import { Tag, Event } from './db'
import { publicSettings } from './settings'
import slugify from 'slugify'
const log = useLogger('tags')

/**
 * Finds existing tags or creates new ones based on the provided list of tag strings.
 * It normalizes the tags for consistent matching and ensures no duplicates are created.
 * @param tags {string[]} An array of tag strings to find or create.
 * @returns Tag[] An array of Tag instances
 */
export async function findOrCreateTags(tags: string[]) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return []
  }

  // normalize and deduplicate tags
  const tagsToCreate = tags
    .filter(tag => tag?.length > 0)
    .map(tag => ({ tag: normalizeTagName(tag), normalizedTag: normalizeTag(tag) }))
    .filter((tag, _idx, arr) => arr.find(t => t.normalizedTag === tag.normalizedTag) === tag)

  // search for existing tags
  const existingTags = await Tag.findAll({ where: { normalizedTag: { [Op.in]: tagsToCreate.map(t => t.normalizedTag) } } })

  // missing tags
  const missing = tagsToCreate
    .filter(t => !existingTags.some(existingTag => existingTag.normalizedTag === t.normalizedTag))

  const createdTags = await Tag.bulkCreate(missing, { returning: true })

  return [
    ...existingTags,
    ...createdTags
  ]
}

export async function cleanOrphanTags() {
  const tags = await Tag.findAll({
    include: [{ model: Event, as: 'events', required: false, attributes: [], through: { attributes: [] } }],
    group: ['tag'],
    having: where(fn('COUNT', col('events.id')), Op.eq, 0)
  })

  if (!tags.length) {
    return
  }
  log.info(`Remove ${tags.length} orphan tags (${tags.map(p => p.tag).join(', ')})`)

  await Tag.destroy({
    where: { tag: { [Op.in]: tags.map(p => p.tag) } }
  })
}

// normalize tags for consistent case/accent-insensitive matching (optional)
slugify.extend({ '$': '', '%': '', ',': '', ':': '', '!': '', '?': '', '#': '' })
export function normalizeTag(tag: string) {
  return slugify(tag, {
    replacement: '',
    trim: true,
    strict: true,
    lower: true,
    locale: publicSettings.instance_locale
  })
}

export function normalizeTagName(tag: unknown): string {
  return typeof tag === 'string' ? tag.trim().replace(/#/g, '') : ''
}
