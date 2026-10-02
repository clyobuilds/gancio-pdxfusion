import { jwtVerify, SignJWT } from 'jose'
import type { UserSession } from './session'

const secret = new TextEncoder().encode(process.env.SESSION_PASSWORD)

export async function signJwt(payload: UserSession, expiresIn = '1 day') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(secret)
}

export async function verifyJwtToken(token: string) {
  const { payload } = await jwtVerify(token, secret)
  return payload as UserSession
}
