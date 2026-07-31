export type UserRole = 'student' | 'teacher' | 'admin'

export type AuthUser = {
  id: string
  schoolId: string
  firstName: string
  lastName: string
  username: string
  role: UserRole
  avatarUrl?: string
  xp: number
  level: number
  streak: number
}
