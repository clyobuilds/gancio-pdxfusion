import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * One-time e-mail login codes (6 digits).
 *
 * Kept in memory on purpose: a code lives about 10 minutes, and if the site restarts the user just asks for a new one.
 * Limits: one code per e-mail address every 60 seconds; a code stops working after 5 wrong tries or when used once.
 * After 5 wrong tries, the address is locked for 15 minutes; each further lock doubles, up to 24 hours. A right code clears this.
 * Only a hash of the code is kept.
 */
const CODE_MINUTES = 10
const COOLDOWN_SECONDS = 60
const MAX_TRIES = 5
const LOCK_MINUTES = 15
const MAX_LOCK_MINUTES = 24 * 60

interface PendingCode { hash: string, expires: number, tries: number, sentAt: number }
const pending = new Map<string, PendingCode>()
interface Lock { until: number, strikes: number }
const locks = new Map<string, Lock>()

/** The time until which this address is locked (0 when it is not). */
function lockedUntil(email: string, now: number): number {
  const lock = locks.get(key(email))
  return lock && lock.until > now ? lock.until : 0
}

function lockAddress(email: string, now: number) {
  const k = key(email)
  const strikes = (locks.get(k)?.strikes ?? 0) + 1
  const minutes = Math.min(LOCK_MINUTES * 2 ** (strikes - 1), MAX_LOCK_MINUTES)
  locks.set(k, { until: now + minutes * 60 * 1000, strikes })
  pending.delete(k)
}

const key = (email: string) => email.trim().toLowerCase()
const hashOf = (email: string, code: string) => createHash('sha256').update(`${key(email)}:${code}`).digest('hex')

function forgetExpired(now: number) {
  for (const [email, item] of pending) {
    if (item.expires < now) pending.delete(email)
  }
}

/** A new code for this address, or null when one was sent less than a minute ago. */
export function createLoginCode(email: string): string | null {
  const now = Date.now()
  forgetExpired(now)
  if (lockedUntil(email, now)) return null
  const old = pending.get(key(email))
  if (old && now - old.sentAt < COOLDOWN_SECONDS * 1000) return null

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  pending.set(key(email), { hash: hashOf(email, code), expires: now + CODE_MINUTES * 60 * 1000, tries: 0, sentAt: now })
  return code
}

/** True when the code is the right one for this address. A right code works once; too many wrong tries void it. */
export function checkLoginCode(email: string, code: string): boolean {
  const now = Date.now()
  if (lockedUntil(email, now)) return false
  const item = pending.get(key(email))
  if (!item) return false
  if (now > item.expires) {
    pending.delete(key(email))
    return false
  }
  item.tries++
  const given = Buffer.from(hashOf(email, code), 'hex')
  const expected = Buffer.from(item.hash, 'hex')
  if (given.length === expected.length && timingSafeEqual(given, expected)) {
    pending.delete(key(email))
    locks.delete(key(email))
    return true
  }
  if (item.tries >= MAX_TRIES) lockAddress(email, now)
  return false
}
