import { useState } from 'react'
import { useSchool } from '../context/SchoolContext'
import { useAuth } from '../hooks/useAuth'

export default function SettingsPage() {
  const { school, schools, refresh } = useSchool()
  const { user, logout } = useAuth()
  const role = (user as any)?.role ?? ''

  const [saving, setSaving] = useState(false)

  // Just a read-only info page since the API has no settings endpoints
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">Account and school information</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* School info */}
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
          {[
            { label: 'Email',   value: school?.email },
            { label: 'Phone',   value: school?.phone },
            { label: 'Address', value: school?.address },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-2 text-sm">
              <span className="w-20 text-gray-500 shrink-0">{label}</span>
              <span className="font-medium text-gray-900">{value || '—'}</span>
            </div>
          ))}
          <button
            onClick={refresh}
            disabled={saving}
            className="w-full mt-2 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Refresh School Info
          </button>
        </div>

        {/* User info */}
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xl">
              {((user as any)?.full_name?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{(user as any)?.full_name ?? '—'}</div>
              <div className="text-xs text-gray-500 capitalize">{role}</div>
            </div>
          </div>
          {[
            { label: 'Email', value: (user as any)?.email },
            { label: 'Role',  value: role },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-2 text-sm">
              <span className="w-20 text-gray-500 shrink-0">{label}</span>
              <span className="font-medium text-gray-900 capitalize">{value || '—'}</span>
            </div>
          ))}

          {/* All schools */}
          {role === 'admin' && schools.length > 1 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500 mb-2">All Schools ({schools.length})</div>
              {schools.map(s => (
                <div key={s.id} className="text-sm text-gray-700 py-1">{s.name}</div>
              ))}
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

      {/* PWA install hint */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-700">
        💡 <strong>Install as app:</strong> Tap your browser's share button and select "Add to Home Screen" to install this portal as a mobile app.
      </div>
    </div>
  )
}