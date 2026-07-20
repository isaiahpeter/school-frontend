import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

const ROLE_ROUTES: Record<string, string> = {
  admin:   '/admin',
  teacher: '/dashboard',
  student: '/dashboard',
  parent:  '/parent',
}

function friendlyError(err: any): string {
  const status  = err?.response?.status
  const message = (err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? '').toLowerCase()

  if (status === 401 || message.includes('invalid') || message.includes('incorrect')
      || message.includes('wrong') || message.includes('password') || message.includes('credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (status === 404 || message.includes('not found') || message.includes('no user')) {
    return 'No account found with that email address.'
  }
  if (status === 429 || message.includes('too many')) {
    return 'Too many login attempts. Please wait a moment and try again.'
  }
  if (status === 0 || message.includes('network') || message.includes('failed to fetch')) {
    return 'Network error. Please check your connection.'
  }
  return 'Login failed. Please try again.'
}

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const user = await login(email.trim(), password)
      toast.success(`Welcome back, ${user.full_name ?? 'there'}!`)
      nav(ROLE_ROUTES[user.role ?? ''] ?? '/dashboard', { replace: true })
    } catch (err: any) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Login</h1>
      <p className="text-sm text-gray-600 mb-6">Sign in to your school portal</p>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 space-y-4">

        {/* Error message */}
        <div className="min-h-[20px] text-sm text-red-600">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={loading}
            required
          />
        </div>

        {/* Password with show/hide toggle */}
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <div className="relative">
            <input
              className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm select-none"
              tabIndex={-1}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 px-3 bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-4 text-sm text-center text-gray-500">
        Need access?{' '}
        <Link to="/register" className="text-violet-600 underline">
          Register here
        </Link>{' '}
        or contact an administrator.
      </div>
    </div>
  )
}
