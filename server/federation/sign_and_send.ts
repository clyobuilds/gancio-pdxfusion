import { useLogger } from '../lib/logger'
import { secretSettings } from '../services/settings'
import { useTaskManager } from '../services/taskManager'
import { prepareHTTPSignature } from './httpsignature'
import type { APActivityBase } from './types'

export async function signAndSend(object: Partial<APActivityBase>, inbox: string, method = 'post') {
  useTaskManager().add({
    name: 'SIGN_AND_SEND',
    method: _signAndSend,
    args: [object, inbox, method, secretSettings.privateKey]
  })
}

export async function _signAndSend(object: Partial<APActivityBase> | '', inbox: string, method: 'post' | 'get' = 'post', privkey: string): Promise<unknown | undefined> {
  const log = useLogger('sign_and_send')
  log.debug('[FEDI] Sign and %s %s', method, inbox)

  const body = JSON.stringify(object)
  const httpSignatureHeaders = prepareHTTPSignature(body, inbox, method, privkey)
  try {
    const ret = await fetch(inbox, {
      headers: {
        ...httpSignatureHeaders,
        'Content-Type': 'application/activity+json',
        'Accept': 'application/activity+json'
      },
      method,
      ...(method === 'post' ? { body } : {})
    })

    const contentType = ret.headers.get('content-type')
    // check if content-type is json
    if (!contentType?.includes('json')) {
      const body = await ret.text()
      log.info(`[FEDI] Error in sign and send, wrong content-type returned: ${contentType} - status: ${ret.status} - body: ${body}`)
      return
    }

    const text = await ret.text()
    if (ret.ok) {
      log.debug(`Signed and verified! ${ret.status} => ${contentType}`)
      if (!text) return ''
      try {
        return JSON.parse(text)
      } catch {
        log.warn('Invalid JSON response', text)
        return ''
      }
    } else {
      const body = JSON.parse(text)
      log.error('Error in sign and send status [%s]: %s', inbox, body)
      throw body
    }
  } catch (e) {
    log.error('Error in sign and send [%s]: %s', inbox, e?.response?.data?.error ?? e?.response?.statusMessage ?? '' + ' ' + String(e))
    throw e
  }
}
