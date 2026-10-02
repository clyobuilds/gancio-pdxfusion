import fs from 'node:fs'
import path from 'node:path'
import { get as getConfig } from '../services/config'
import { useLogger } from '../lib/logger'

export async function useCreateDirectoryStructure() {
  const log = useLogger('init')
  const config = getConfig()

  try {
    await fs.promises.mkdir(path.join(config.upload_path, 'thumb'), { recursive: true })
    log.info('Thumbnails directory created')
  } catch (err) {
    log.error(err)
  }
}
