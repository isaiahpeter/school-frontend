import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type Role = 'admin' | 'teacher' | 'student' | 'parent' | string

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
}

export default function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[]
  children: React.ReactElement
}) {
  const { status, user } = useAuth()
  const location = useLocation()

  // Still rehydrating from localStorage — don't redirect yet
  if (status === 'loading') {
    return <div className="p-6">Loading...</div>
  }

  // Not logged in — send to login, preserve intended destination
  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Logged in but wrong role — send to their correct home
  if (roles && roles.length > 0) {
    const role = (user as any)?.role ?? (user as any)?.user_role
    const normalizedRole: string = Array.isArray(role) ? (role[0] ?? 'student') : (role ?? 'student')

    if (!roles.includes(normalizedRole)) {
      return <Navigate to={ROLE_HOME[normalizedRole] ?? '/student'} replace />
    }
  }

  return children
}