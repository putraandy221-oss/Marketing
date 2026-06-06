export type UserRole = 'owner' | 'manager' | 'staff'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name?: string
}
