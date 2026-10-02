import { appendResponseHeader } from 'h3'
import { useState, computed, useRequestFetch, useRequestEvent } from '#imports'
import type { UserSession } from '~~/server/lib/session'

/**
 * Composable to get the user session (copied from nuxt-auth-utils)
 */
export function useUserSession() {
  const serverEvent = import.meta.server ? useRequestEvent() : null
  const sessionState = useState<{ user: UserSession } | null>('nuxt-session', () => null)
  const authReadyState = useState('nuxt-auth-ready', () => false)

  const clear = async () => {
    await useRequestFetch()('/api/session', {
      method: 'DELETE',
      onResponse({ response: { headers } }: { response: { headers: Headers } }) {
        // Forward the Set-Cookie header to the main server event
        if (import.meta.server && serverEvent) {
          for (const setCookie of headers.getSetCookie()) {
            appendResponseHeader(serverEvent, 'Set-Cookie', setCookie)
          }
        }
      }
    })
    sessionState.value = null
  }

  const fetch = async () => {
    sessionState.value = await useRequestFetch()<{ user: UserSession }>('/api/session', {
      headers: {
        accept: 'application/json'
      },
      retry: false
    }).catch(() => null)
    if (!authReadyState.value) {
      authReadyState.value = true
    }
  }

  return {
    ready: computed(() => authReadyState.value),
    loggedIn: computed(() => Boolean(sessionState.value)),
    user: computed(() => sessionState.value || null),
    session: sessionState,
    fetch,
    clear
  }
}