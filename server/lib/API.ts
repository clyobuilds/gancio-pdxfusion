import { type H3Event, setHeader, handleCacheHeaders } from 'h3'
import type { Model, ModelStatic } from '@sequelize/core'
import { Stats } from 'node:fs'

export function enableCors(evt: H3Event) {
  setHeader(evt, 'Access-Control-Allow-Origin', '*')
}

/**
 * handle cache headers based on the provided etagSource that could come from a file, a model, a date or a custom string
 * - when Model is used, it will fetch the latest updatedAt date from the model
 * - when Stats from a file, it will use the file's mtimeMs as the etag
 * @link https://www.compilenrun.com/docs/middleware/nginx/nginx-caching/nginx-microcaching/
 */
export async function handleCache(evt: H3Event, etagSource: Stats | Date | string | ModelStatic<Model> = '', maxAge: number = 1) {
  let etag
  if (etagSource instanceof Stats) {
    etag = `"${etagSource.size}-${Number(etagSource.mtimeMs).toString(16)}"`
  } else if (typeof etagSource === 'function' && 'getAttributes' in etagSource && 'max' in etagSource) {
    const max: Date | null = await etagSource.max('updatedAt')
    if (!max) etag = ''
    else etag = `"${max.getTime()}"`
  } else if (etagSource instanceof Date) {
    etag = `"${etagSource.getTime()}"`
  } else if (typeof etagSource === 'string') {
    etag = etagSource
  }
  return handleCacheHeaders(evt, { etag, maxAge })
}