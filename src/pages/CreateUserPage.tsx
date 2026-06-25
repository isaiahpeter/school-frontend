import  { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'

const ROLES = ['admin','teacher','student','parent'] as const
type Role = typeof ROLES[number]

export default function CreateUserPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    role: 'student' as Role, school_id: '',
  })
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<any>(null)

  useEffect(() => {
    api.get('/api/schools')
      .then(res => {
        const list = res.data?.value ?? res.data ?? []
        setSchools(list)
        if (list[0]) setForm(f => ({ ...f, school_id: list[0].id }))
      })
  }, [])

  async function createUser() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim())
      return toast.error('Name, email and password are required')
    if (form.password.length < 6)
      return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      const res = await api.post('/api/users', form)
      toast.success('User created successfully')
      setCreated(res.data?.user ?? res.data)
      setForm(f => ({ ...f, full_name: '', email: '', password: '' }))
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create user')
    } finally { setSaving(false) }
  }

  const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Create User</h1>
        <p className="text-sm text-gray-500">Add any user with any role directly</p>
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input className={inp} placeholder="e.g. John Doe"
            value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input className={inp} type="email" placeholder="user@example.com"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input className={inp} type="password" placeholder="Min. 6 characters"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                  form.role === r
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-violet-300'
                }`}>
                {r === 'admin' ? '⚙️' : r === 'teacher' ? '👩‍🏫' : r === 'student' ? '👨‍🎓' : '👨‍👩‍👧'} {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
          <select className={inp} value={form.school_id}
            onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}>
            <option value="">— Select School —</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <button onClick={createUser} disabled={saving}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg disabled:opacity-60 transition-colors">
          {saving ? 'Creating…' : 'Create User'}
        </button>
      </div>

      {/* Created user info */}
      {created && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="font-medium text-green-800">✓ User created</div>
          <div className="text-sm text-green-700 space-y-1">
            <div>Name: <strong>{created.full_name}</strong></div>
            <div>Email: <strong>{created.email}</strong></div>
            <div>Role: <strong className="capitalize">{created.role}</strong></div>
            <div>ID: <code className="text-xs bg-green-100 px-1 py-0.5 rounded">{created.id}</code></div>
          </div>
        </div>
      )}
    </div>
  )
}
