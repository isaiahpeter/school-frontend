import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

export default function StudentDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.get('/api/students')
      .then(res => {
        const list: Student[] = res.data?.value ?? res.data ?? []
        const found = list.find(s => s.id === id) ?? null
        setStudent(found)
        if (!found) setError('Student not found')
      })
      .catch(() => setError('Failed to load student'))
      .finally(() => setLoading(false))
  }, [id])

  const field = (label: string, value?: string | null) => (
    <div className="flex gap-2 text-sm">
      <span className="w-36 text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900">{value ?? '—'}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => nav('/students')}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Student Details</h1>
      </div>

      {loading ? (
        <div className="bg-white border rounded-xl p-5 space-y-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-64" />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      ) : student ? (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xl">
              {student.users?.full_name?.[0]?.toUpperCase() ?? 'S'}
            </div>
            <div>
              <div className="text-lg font-semibold">{student.users?.full_name ?? '—'}</div>
              <div className="text-sm text-gray-500">{student.users?.email ?? '—'}</div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {field('Admission No.', student.admission_number)}
            {field('Date of Birth', student.date_of_birth)}
            {field('Enrollment Date', student.enrollment_date)}
            {field('Guardian Name', student.guardian_name)}
            {field('Guardian Phone', student.guardian_phone)}
            {field('Guardian Email', student.guardian_email)}
          </div>
        </div>
      ) : null}
    </div>
  )
}