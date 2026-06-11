import React, { createContext, useEffect, useMemo, useState } from 'react'
import { api, setAuthToken } from '../lib/apiClient'
import { clearToken, getToken, setToken } from '../lib/storage'
import { decodeJwt } from '../utils/jwt'
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

// ─── Context — must be declared before AuthProvider uses it ───────────────────

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [token, setTokenState] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const stored = getToken()
    if (stored) {
      setTokenState(stored)
      setAuthToken(stored)
      const decoded = decodeJwt(stored) as any
      setUser(decoded?.user ?? decoded)
      setStatus('authenticated')
    } else {
      setStatus('unauthenticated')
    }
  }, [])

  const schoolIdFromToken = useMemo<UUID | null>(() => {
    if (!token) return null
    const decoded = decodeJwt(token) as any
    return decoded?.school_id ?? decoded?.schoolId ?? null
  }, [token])

  function persist(data: LoginResponse) {
    setToken(data.token)
    setTokenState(data.token)
    setAuthToken(data.token)
    setUser(data.user)
    setStatus('authenticated')
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
    setAuthToken(null)
    setTokenState(null)
    setUser(null)
    setStatus('unauthenticated')
  }

  return (
    <AuthContext.Provider value={{ status, token, user, schoolIdFromToken, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}