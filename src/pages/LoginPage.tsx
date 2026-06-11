import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

const ROLE_ROUTES: Record<string, string> = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
}

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.full_name ?? 'there'}!`)
      nav(ROLE_ROUTES[user.role] ?? '/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Login</h1>
      <p className="text-sm text-gray-600 mb-6">Sign in to your school portal</p>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5">
        {/* Fixed-height error slot — no layout shift */}
        <div className="mb-3 h-5 text-sm text-red-600">{error ?? ''}</div>

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-3 disabled:bg-gray-50 disabled:cursor-not-allowed"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          disabled={loading}
          required
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-4 disabled:bg-gray-50 disabled:cursor-not-allowed"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          disabled={loading}
          required
        />
        <button
  type="submit"
  disabled={loading}
  className="w-full rounded-lg py-2 px-3 bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
>
  {loading ? 'Signing in…' : 'Sign in'}
</button>
      </form>

      <div className="mt-4 text-sm text-center text-gray-500">
        Need access?{' '}
        <Link to="/register" className="text-primary underline">
          Register here
        </Link>{' '}
        or contact an administrator.
      </div>
    </div>
  )
}
