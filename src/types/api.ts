// Minimal types derived from the OpenAPI spec.
// Extend as needed.

export type UUID = string

export type Role = 'admin' | 'teacher' | 'student' | 'parent'

export interface User {
  id: UUID
  email: string
  full_name?: string
  role?: Role
}

export interface LoginResponse {
  token: string
  user: User
}

export interface SchoolSettings {
  id?: UUID
  name: string
  logo_url?: string
  settings?: {
    primary_color?: string
    [k: string]: any
  }
  // Domain field is not guaranteed by spec but used by /api/school/domain
  domain?: string
}

export interface Student {
  id: UUID
  full_name: string
  email?: string
  phone?: string
  admission_number?: string
  date_of_birth?: string
  // Keep flexible
  [k: string]: any
}

export interface CaptureEvent {
  id?: UUID
  timestamp?: string
  image_hash?: string
  image_url?: string
  camera_id?: string
  [k: string]: any
}

