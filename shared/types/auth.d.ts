import type { UserRole } from '~~/server/services/db'

// shared/types/auth.d.ts
declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    role: UserRole
  }
}
