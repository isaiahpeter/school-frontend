import React, { createContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/apiClient'
import { clearToken, getToken, setToken } from '../lib/storage'
import type { LoginResponse, User, UUID } from '../types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  status: AuthStatus
  token: string | null
  user: User | null
  schoolIdFromToken: UUID | null
  login: (email: string, password: string) => Promise<User>
  register: (payload: any) => Promise<User>
  logout: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [token, setTokenState] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  // Rehydrate on mount — use stored user object since JWT has no role field
  useEffect(() => {
    const stored = getToken()
    if (stored) {
      setTokenState(stored)
      // Attach token to axios defaults directly
      api.defaults.headers.common['Authorization'] = `Bearer ${stored}`
      const savedUser = localStorage.getItem('school_user')
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)) } catch {}
      }
      setStatus('authenticated')
    } else {
      setStatus('unauthenticated')
    }
  }, [])

  const schoolIdFromToken = useMemo<UUID | null>(() => {
    if (!token) return null
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload?.school_id ?? payload?.schoolId ?? null
    } catch { return null }
  }, [token])

  function persist(data: LoginResponse) {
    setToken(data.token)
    setTokenState(data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser(data.user)
    setStatus('authenticated')
    localStorage.setItem('school_user', JSON.stringify(data.user))
  }

  async function login(email: string, password: string): Promise<User> {
    const res = await api.post<LoginResponse>('/api/auth/login', { email, password })
    persist(res.data)
    return res.data.user
  }

  async function register(payload: any): Promise<User> {
    const res = await api.post<LoginResponse>('/api/auth/register', payload)
    persist(res.data)
    return res.data.user
  }

  function logout() {
    clearToken()
    delete api.defaults.headers.common['Authorization']
    setTokenState(null)
    setUser(null)
    setStatus('unauthenticated')
    localStorage.removeItem('school_user')
  }

  return (
    <AuthContext.Provider value={{ status, token, user, schoolIdFromToken, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}