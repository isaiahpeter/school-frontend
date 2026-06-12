import { useState } from 'react'
import { useSchool } from '../context/SchoolContext'
import { useAuth } from '../hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'teacher' | 'student' // Adjust based on your actual system roles
}

interface InfoRowProps {
  label: string
  value: string | undefined | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-20 text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 capitalize">{value || '—'}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { school, schools, refresh } = useSchool()
  const { user, logout } = useAuth()
  
  // Cast once here to keep the JSX perfectly clean and type-safe
  const currentUser = user as AuthUser | null
  const role = currentUser?.role ?? ''

  const [saving] = useState(false) // Ready if you connect an update endpoint later

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">Account and school information</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* School Info Card */}
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b">
            <div className="h-12 w-12 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-xl">
              {school?.name?.[0] ?? 'S'}
            </div>
            <div>
              <div className="font-semibold">{school?.name ?? '—'}</div>
              <div className="text-xs text-gray-500">School</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <InfoRow label="Email" value={school?.email} />
            <InfoRow label="Phone" value={school?.phone} />
            <InfoRow label="Address" value={school?.address} />
          </div>

          <button
            onClick={refresh}
            disabled={saving}
            className="w-full mt-2 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Refresh School Info
          </button>
        </div>

        {/* User Info Card */}
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xl">
              {(currentUser?.full_name?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{currentUser?.full_name ?? '—'}</div>
              <div className="text-xs text-gray-500 capitalize">{role}</div>
            </div>
          </div>

          <div className="space-y-3">
            <InfoRow label="Email" value={currentUser?.email} />
            <InfoRow label="Role" value={role} />
          </div>

          {/* Multi-school context for Admins */}
          {role === 'admin' && schools.length > 1 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500 mb-2 font-medium">
                All Schools ({schools.length})
              </div>
              <div className="divide-y divide-gray-50 max-h-32 overflow-y-auto pr-1">
                {schools.map(s => (
                  <div key={s.id} className="text-sm text-gray-700 py-1.5 file:font-medium">
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full mt-2 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* PWA Install Hint */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-700 flex items-start gap-2">
        <span className="shrink-0">💡</span>
        <span>
          <strong>Install as app:</strong> Tap your browser's share button and select 
          {" "}<span className="font-semibold">"Add to Home Screen"</span> to install this portal as a native mobile app experience.
        </span>
      </div>
    </div>
  )
}