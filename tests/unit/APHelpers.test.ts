import { describe, expect, it } from 'vitest'
import { sameOrigin } from '../../server/federation/helpers'

describe('APHelpers', () => {
  it('should check same origin', () => {
    expect(sameOrigin('https://a.com', 'https://a.com')).toBe(true)
    expect(sameOrigin('https://a.com', 'https://a.com/')).toBe(true)
    expect(sameOrigin('https://a.com', 'https://a.com:443')).toBe(true)

    expect(sameOrigin('https://a.com', 'https://b.com')).toBe(false)
    expect(sameOrigin('https://a.com', 'http://a.com')).toBe(false)
    expect(sameOrigin('https://a.com', 'https://a.com:8443')).toBe(false)
    expect(sameOrigin('https://a.com', 'https://a.com.evil.com')).toBe(false)
  })
})