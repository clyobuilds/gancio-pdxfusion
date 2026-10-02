import { z } from 'zod'

// https://docs-p.joinmastodon.org/api/guidelines/#focal-points
export const focalPointSchema = z.union([
  z.string().transform((val) => {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : val.split(',')
    } catch {
      return val.split(',')
    }
  }),
  z.array(z.union([z.number(), z.string()]))
])
  .transform((val) => {
    const [x = '0', y = '0'] = val

    return [
      Number(parseFloat(String(x)).toFixed(2)),
      Number(parseFloat(String(y)).toFixed(2))
    ]
  })
  .pipe(z.tuple([
    z.number().min(-1).max(1),
    z.number().min(-1).max(1)
  ]))

// https://zod.dev/codecs?id=jsonschema
export const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString)
      } catch (err) {
        ctx.issues.push({
          code: 'invalid_format',
          format: 'json',
          input: jsonString,
          message: err?.message
        })
        return z.NEVER
      }
    },
    encode: value => JSON.stringify(value)
  })
