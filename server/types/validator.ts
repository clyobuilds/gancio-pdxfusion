import { z } from 'zod'

export const formatSchema = z.object({
  format: z.enum(['json', 'rss', 'ics', 'feed', 'json-ld']).default('json').transform(t => t === 'feed' ? 'rss' : t)
})
