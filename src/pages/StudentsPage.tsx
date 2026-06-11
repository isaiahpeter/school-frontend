import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'

interface StudentUser {
  id: string
  email: string
  full_name: string
  role: string
}

interface Student {
  id: string
  user_id: string
  school_id?: string
  admission_number?: string
  date_of_birth?: string
  guardian_name?: string
  guardian_phone?: string
  guardian_email?: string
  enrollment_date?: string
  created_at?: string
  users: StudentUser
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    api.get('/api/students')
      .then(res => setStudents(res.data?.value ?? res.data ?? []))
      .catch(e => setError(e?.response?.data?.message ?? 'Failed to load students'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-gray-500">Manage student profiles</p>
        </div>
        <button
          className="rounded-lg px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
          onClick={() => nav('/students/new')}
        >
          + Add
        </button>
      </div>

      {/* Error */}
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b text-sm text-gray-500">
          Total: {loading ? '…' : students.length}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Admission No.</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Skeleton rows
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.users?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.users?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.guardian_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.guardian_phone ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.admission_number ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-xs text-white rounded-lg px-3 py-1.5 bg-violet-600 hover:bg-violet-700 transition-colors"
                        onClick={() => nav(`/students/${s.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}