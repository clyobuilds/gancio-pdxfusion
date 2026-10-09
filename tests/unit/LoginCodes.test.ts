import { describe, it, expect, vi, afterEach } from 'vitest'
import { createLoginCode, checkLoginCode } from '~~/server/services/loginCodes'

const EMAIL = 'organizer@example.org'

afterEach(() => {
  vi.useRealTimers()
})

describe('e-mail login codes', () => {
  it('makes a 6-digit code', () => {
    const code = createLoginCode('code-format@example.org')
    expect(code).toMatch(/^\d{6}$/)
  })

  it('accepts the right code once only', () => {
    const code = createLoginCode('once@example.org')!
    expect(checkLoginCode('once@example.org', code)).toBe(true)
    expect(checkLoginCode('once@example.org', code)).toBe(false)
  })

  it('rejects a wrong code', () => {
    const code = createLoginCode('wrong@example.org')!
    const wrong = code === '000000' ? '111111' : '000000'
    expect(checkLoginCode('wrong@example.org', wrong)).toBe(false)
  })

  it('does not send a second code within a minute', () => {
    createLoginCode('cooldown@example.org')
    expect(createLoginCode('cooldown@example.org')).toBeNull()
  })

  it('allows a new code after a minute', () => {
    vi.useFakeTimers()
    createLoginCode('later@example.org')
    vi.setSystemTime(Date.now() + 61_000)
    expect(createLoginCode('later@example.org')).toMatch(/^\d{6}$/)
  })

  it('stops accepting a code after 10 minutes', () => {
    vi.useFakeTimers()
    const code = createLoginCode('expire@example.org')!
    vi.setSystemTime(Date.now() + 11 * 60_000)
    expect(checkLoginCode('expire@example.org', code)).toBe(false)
  })

  it('voids the code after 5 wrong tries, even the right one', () => {
    const code = createLoginCode('tries@example.org')!
    const wrong = code === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) expect(checkLoginCode('tries@example.org', wrong)).toBe(false)
    expect(checkLoginCode('tries@example.org', code)).toBe(false)
  })

  it('ignores case and spaces in the address', () => {
    const code = createLoginCode(`  ${EMAIL.toUpperCase()} `)!
    expect(checkLoginCode(EMAIL, code)).toBe(true)
  })

  it('answers no for an address with no code', () => {
    expect(checkLoginCode('nobody@example.org', '123456')).toBe(false)
  })

  it('locks the address after 5 wrong tries, even with new codes', () => {
    vi.useFakeTimers()
    const email = 'lock@example.org'
    const code = createLoginCode(email)!
    const wrong = code === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) checkLoginCode(email, wrong)
    vi.setSystemTime(Date.now() + 61_000)
    expect(createLoginCode(email)).toBeNull()
  })

  it('unlocks after 15 minutes, and a second lock lasts twice as long', () => {
    vi.useFakeTimers()
    const email = 'backoff@example.org'
    const wrong = (c: string) => (c === '000000' ? '111111' : '000000')
    const first = createLoginCode(email)!
    for (let i = 0; i < 5; i++) checkLoginCode(email, wrong(first))
    vi.setSystemTime(Date.now() + 16 * 60_000)
    const second = createLoginCode(email)!
    expect(second).toMatch(/^\d{6}$/)
    for (let i = 0; i < 5; i++) checkLoginCode(email, wrong(second))
    vi.setSystemTime(Date.now() + 16 * 60_000)
    expect(createLoginCode(email)).toBeNull()
    vi.setSystemTime(Date.now() + 16 * 60_000)
    expect(createLoginCode(email)).toMatch(/^\d{6}$/)
  })
})
