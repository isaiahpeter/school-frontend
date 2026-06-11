import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

const ROLES = ['admin', 'teacher', 'student', 'parent'] as const
type Role = typeof ROLES[number]

const ROLE_ROUTES: Record<Role, string> = {
  admin: '/admin', teacher: '/dashboard',
  student: '/dashboard', parent: '/dashboard',
}

export default function RegisterPage() {
  const { register } = useAuth()
  const nav = useNavigate()

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'student' as Role, school_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return setError('Full name is required')
    if (!form.email.trim())     return setError('Email is required')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    setError(null)
    try {
      const payload: any = {
        full_name: form.full_name,
        email:     form.email,
        password:  form.password,
        role:      form.role,
      }
      if (form.school_id.trim()) payload.school_id = form.school_id.trim()
      const user = await register(payload)
      toast.success(`Welcome, ${user.full_name ?? 'there'}!`)
      nav(ROLE_ROUTES[user.role as Role] ?? '/dashboard', { replace: true })
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-gray-50"

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-violet-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Join the school portal</p>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
          {/* Error */}
          <div className="h-5 text-sm text-red-600">{error ?? ''}</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input className={inp} placeholder="e.g. Chizitara Alochukwu"
              value={form.full_name} onChange={e => update('full_name', e.target.value)}
              disabled={loading} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className={inp} type="email" placeholder="you@example.com"
              value={form.email} onChange={e => update('email', e.target.value)}
              disabled={loading} autoComplete="email" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input className={inp} type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={e => update('password', e.target.value)}
              disabled={loading} autoComplete="new-password" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => update('role', r)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    form.role === r
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-violet-300'
                  }`}
                >
                  {r === 'admin' ? '⚙️' : r === 'teacher' ? '👩‍🏫' : r === 'student' ? '👨‍🎓' : '👨‍👩‍👧'} {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School ID <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input className={inp} placeholder="UUID of the school"
              value={form.school_id} onChange={e => update('school_id', e.target.value)}
              disabled={loading} />
            <p className="text-xs text-gray-400 mt-1">Leave blank if you don't know it yet</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg disabled:opacity-60 transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </div>

        <div className="mt-4 text-sm text-center text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-600 hover:underline font-medium">Sign in</Link>
        </div>
      </div>
    </div>
  )
}