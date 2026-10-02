import { type H3Event, createError } from 'h3'
import { getUser } from './getUser'
import type { UserRole } from '../services/db'

/**
 * Require an user to be authenticated
 */
export async function requireUser(event: H3Event) {
  const user = await getUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return user
}

// require current user role to be one of the specified
export async function requireRole(evt: H3Event, roles: UserRole[] | UserRole) {
  const user = await isRole(evt, roles)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}

// check if current user role is one of specified
export async function isRole(evt: H3Event, roles: UserRole[] | UserRole) {
  const user = await getUser(evt)
  if (!user) return
  if (!Array.isArray(roles)) {
    roles = [roles]
  }
  return roles.includes(user?.role) ? user : false
}

/**
 * Require an admin session, throw a 401 error if the user is not logged in
 */
export async function requireAdmin(evt: H3Event) {
  return requireRole(evt, 'admin')
}
