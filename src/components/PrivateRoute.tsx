import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="p-6">Loading...</div>
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

