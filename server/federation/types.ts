import { z } from 'zod'

const stringOrArray = z.union([z.string(), z.array(z.string())]).optional().transform(v => Array.isArray(v) ? v : v ? [v] : [])

export const APActivityTypeSchema = z.enum([
  'Follow', 'Undo', 'Like', 'Announce',
  'Create', 'Delete', 'Update', 'Accept',
  'EchoRequest', 'QuoteRequest'
])
export type APActivityType = z.infer<typeof APActivityTypeSchema>

export const APProofSchema = z.object({
  type: z.literal('DataIntegrityProof'),
  proofPurpose: z.literal('assertionMethod'),
  cryptosuite: z.literal('eddsa-jcs-2022'),
  proofValue: z.string(),
  verificationMethod: z.string(),
  created: z.string()
})
export type APProof = z.infer<typeof APProofSchema>

// https://www.w3.org/wiki/ActivityPub/Primer/Actors
// https://www.w3.org/TR/activitypub/#actors
export interface APActor {
  id: string
  name: string
  icon: { url: string }
  summary?: string
  preferredUsername: string
  discoverable?: boolean
  indexable?: boolean
  inbox: string
  outbox: string
  type: string
  endpoints?: { sharedInbox?: string }
  attachments?: Array<{
    type: string
    name: string
    url: string
  }>
  url?: string
  publicKey?: {
    id: string
    owner: string
    publicKeyPem: string
  }
  assertionMethod?: Array<{
    id: string
    type: 'Multikey'
    controller: string
    publicKeyMultibase: string
  }>
}

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-attachment
export const APAttachmentSchema = z.object({
  type: z.enum(['Image', 'Video', 'Audio', 'Document', 'Link']),
  mediaType: z.string().optional(),
  name: z.string().optional(),
  url: z.url().optional(),
  link: z.url().optional(),
  href: z.url().optional(),
  focalPoint: z.array(z.number()).length(2).optional()
})
export type APAttachment = z.infer<typeof APAttachmentSchema>

export const APNoteSchema = z.object({
  type: z.literal('Note').default('Note'),
  id: z.string(),
  attributedTo: z.string().optional(),
  inReplyTo: z.string().optional(),
  url: z.url().optional(),
  content: z.string().optional(),
  summary: z.string().nullable().optional(),
  published: z.iso.datetime().nullable().optional(),
  updated: z.iso.date().optional(),
  attachment: z.array(APAttachmentSchema).optional(),
  sensitive: z.boolean().optional(),
  to: stringOrArray,
  cc: stringOrArray,
  quote: z.string().optional(),
  quoteUri: z.string().optional(),
  _misskey_quote: z.string().optional()
})
export type APNote = z.infer<typeof APNoteSchema>

// https://www.w3.org/TR/activitystreams-vocabulary/#places
// https://fediverse.codeberg.page/fep/fep/8a8e/#physical
// https://schema.org/PostalAddress
export const PostalAddressSchema = z.object({
  type: z.literal('PostalAddress'),
  streetAddress: z.string().optional().nullable(),
  addressLocality: z.string().optional().nullable(),
  addressRegion: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  addressCountry: z.string().optional().nullable()
})
export type PostalAddress = z.infer<typeof PostalAddressSchema>

export const APTagSchema = z.object({
  type: z.enum(['Mention', 'Hashtag']),
  name: z.string(),
  href: z.url().optional()
})
export type APTag = z.infer<typeof APTagSchema>

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-place
export const APLocationSchema = z.object({
  type: z.enum(['Place', 'VirtualLocation']),
  name: z.string().optional(),
  id: z.string().optional(),
  url: z.url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.union([PostalAddressSchema, z.string()]).optional()
})
export type APLocation = z.infer<typeof APLocationSchema>

// https://fediverse.codeberg.page/fep/fep/8a8e/#event-status
export const EventStatusEnum = ['EventCancelled', 'EventScheduled', 'EventTentative', 'EventMovedOnline', 'EventPostponed', 'EventRescheduled'] as const

// https://fediverse.codeberg.page/fep/fep/8a8e/
export const APEventSchema = z.looseObject({
  type: z.literal('Event').default('Event'),
  name: z.string().trim(),
  startTime: z.string().refine(v => !isNaN(Date.parse(v))),
  endTime: z.string().nullable().refine(v => v === null || !isNaN(Date.parse(v))).optional(),
  displayEndTime: z.boolean().optional(),
  id: z.string().optional(),
  attributedTo: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  url: z.url().optional(),
  content: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  eventStatus: z.enum(EventStatusEnum).optional().default('EventScheduled'),
  attachment: z.array(APAttachmentSchema).optional(),
  location: z.union([APLocationSchema, z.array(APLocationSchema)]).optional(),
  tag: z.array(APTagSchema).optional(),
  published: z.iso.datetime().optional(),
  updated: z.iso.datetime().optional(),
  timezone: z.string().optional(),
  signature: z.object().optional().nullable(),
  interactionPolicy: z.object({
    canQuote: z.object({
      automaticApproval: stringOrArray,
      manualApproval: stringOrArray
    }).optional()
  }).optional()
}).refine(
  e => !e.endTime || e.endTime >= e.startTime,
  { message: 'endTime must be after startTime' }
)
export type APEvent = z.infer<typeof APEventSchema>

export const APActivityBaseSchema = z.looseObject({
  id: z.string().optional(), // id is not mandatory for some activities (i.e. Follow)
  type: APActivityTypeSchema,
  object: z.unknown().optional(),
  proof: APProofSchema.optional(),
  actor: z.union([z.string(), z.object({ id: z.string() })]).transform(v => typeof v === 'string' ? v : v?.id),
  attributedTo: z.union([z.string(), z.object({ id: z.string() })]).transform(v => typeof v === 'string' ? v : v?.id).optional(),
  to: stringOrArray,
  cc: stringOrArray
})

export type APActivityBase = z.infer<typeof APActivityBaseSchema>

export const APActivityUndoSchema = z.object({
  actor: z.string(),
  type: z.literal('Undo'),
  object: z.object({
    type: z.enum(['Follow', 'Announce', 'Like']),
    object: z.string()
  })
})

export type APActivityUndo = z.infer<typeof APActivityUndoSchema>