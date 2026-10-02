import { defineEventHandler, readValidatedBody, createError } from 'h3'
import { z } from 'zod'
import { useLogger } from '~~/server/lib/logger'
import { requireAdmin } from '~~/server/lib/auth'
import { Tag } from '~~/server/services'
import { normalizeTag } from '~~/server/services/tags'
const schema = z.object({
  tag: z.string(),
  newTag: z.string()
})

/**
 * Rename a tag
 * @auth
 * @param {string} tag - Original tag
 * @param {string} newTag - New tag
 * @info rename the tag with `newTag` or merge it with an existing one, in this case all associated events will also be updated
 */
export default defineEventHandler(async (evt) => {
  await requireAdmin(evt)
  const log = useLogger('tag update')
  const { tag, newTag: newTagStr } = await readValidatedBody(evt, schema.parse)

  const oldtag = await Tag.findByPk(tag)
  if (!oldtag) {
    log.error('This tag does not exist: ', tag)
    throw createError({ status: 404, message: 'This tag does not exists' })
  }

  const newTagNormalized = normalizeTag(newTagStr)

  const newtag = await Tag.findByPk(newTagNormalized)
  // if the new tag does not exists, just rename the old one
  if (!newtag) {
    log.info(`Rename tag "${oldtag.tag}" to "${newTagNormalized}"`)
    await Tag.update({ tag: newTagNormalized }, { where: { tag } })
  } else {
    log.info(`Merge tag "${oldtag.tag}" to "${newTagNormalized}"`)
    // in case it exists:
    // - search for events with old tag
    const events = await oldtag.getEvents()
    // - substitute it with the new one
    await oldtag.removeEvents(events)
    await newtag.addEvents(events)
  }
})
