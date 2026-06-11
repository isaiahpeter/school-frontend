import { useState } from 'react'
import { useSchool } from '../context/SchoolContext'
import { api } from '../lib/apiClient'

export default function SettingsPage() {
  const { settings, refresh } = useSchool()
  const [domain, setDomain] = useState(settings?.domain ?? '')
  const [logoUploading, setLogoUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function saveDomain() {
    setSaving(true)
    try {
      // Spec in prompt: POST /api/school/domain
      await api.post('/api/school/domain', { domain })
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      // Endpoint unknown; best-effort: /api/school/logo
      await api.post('/api/school/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refresh()
    } finally {
      setLogoUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-600">Branding and domain configuration</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="font-medium">Domain</div>
          <div className="text-sm text-gray-600">Current: {settings?.domain ?? '—'}</div>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="portal.myschool.sch.ng"
          />
          <button
            disabled={saving}
            className="w-full rounded-lg py-2 text-white font-medium"
            style={{ background: 'var(--school-primary, #7c3aed)' }}
            onClick={saveDomain}
          >
            {saving ? 'Saving...' : 'Save domain'}
          </button>
        </div>

        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="font-medium">Logo</div>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-24 w-24 object-contain" />
          ) : (
            <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">No logo</div>
          )}
          <input
            type="file"
            accept="image/*"
            disabled={logoUploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadLogo(f)
            }}
          />
          {logoUploading ? <div className="text-sm text-gray-600">Uploading...</div> : null}
        </div>
      </div>
    </div>
  )
}

