import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'
import { useAuth } from '../hooks/useAuth'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface AttendanceRecord {
  id: string
  student_id: string
  class_id: string
  date: string
  status: AttendanceStatus
  students: { users: { full_name: string } }
  classes: { name: string }
}

interface Student {
  id: string
  users: { full_name: string; email: string }
}

interface Class {
  id: string
  name: string
  section: string
}

interface Teacher {
  id: string
  user_id: string
}

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700 border-green-300',
  absent:  'bg-red-100 text-red-700 border-red-300',
  late:    'bg-yellow-100 text-yellow-700 border-yellow-300',
  excused: 'bg-gray-100 text-gray-600 border-gray-300',
}

const STATUS_ICONS: Record<AttendanceStatus, string> = {
  present: '✓',
  absent:  '✗',
  late:    '⏰',
  excused: '📋',
}

export default function AttendancePage() {
  const { user } = useAuth()
  const role = (user as any)?.role ?? 'student'
  const userId = (user as any)?.id

  const [classes,    setClasses]    = useState<Class[]>([])
  const [students,   setStudents]   = useState<Student[]>([])
  const [records,    setRecords]    = useState<AttendanceRecord[]>([])
  const [teachers,   setTeachers]   = useState<Teacher[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate,  setSelectedDate]  = useState(
    new Date().toISOString().split('T')[0]
  )
  const [filterStudent, setFilterStudent] = useState('')

  // Mark attendance state (teacher/admin)
  const [markMode,   setMarkMode]   = useState(false)
  const [markStatus, setMarkStatus] = useState<Record<string, AttendanceStatus>>({})
  const [saving,     setSaving]     = useState(false)

  const [loading, setLoading] = useState(true)

  // Find teacher profile for current user
  const myTeacher = teachers.find(t => t.user_id === userId)

  useEffect(() => {
    Promise.all([
      api.get('/api/classes'),
      api.get('/api/students'),
      api.get('/api/teachers'),
      api.get('/api/enrollments'),
    ]).then(([cl, st, th, en]) => {
      const classList    = cl.data?.value ?? cl.data ?? []
      const studentList  = st.data?.value ?? st.data ?? []
      const teacherList  = th.data?.value ?? th.data ?? []
      const enrollList   = en.data?.value ?? en.data ?? []
      setClasses(classList)
      setStudents(studentList)
      setTeachers(teacherList)
      setEnrollments(enrollList)
      if (classList[0]) setSelectedClass(classList[0].id)
    }).catch(() => toast.error('Failed to load data'))
    .finally(() => setLoading(false))
  }, [])

  // Load attendance when class or date changes
  useEffect(() => {
    if (!selectedClass) return
    loadAttendance()
  }, [selectedClass, selectedDate])

  async function loadAttendance() {
    try {
      const res = await api.get('/api/attendance', {
        params: { class_id: selectedClass, date: selectedDate }
      })
      setRecords(res.data?.value ?? res.data ?? [])
    } catch {
      toast.error('Failed to load attendance')
    }
  }

  // Students enrolled in selected class
  const enrolledStudents = students.filter(s =>
    enrollments.some(e => e.student_id === s.id && e.class_id === selectedClass)
  )

  // Start mark mode — pre-fill existing statuses
  function startMarkMode() {
    const initial: Record<string, AttendanceStatus> = {}
    enrolledStudents.forEach(s => {
      const existing = records.find(r => r.student_id === s.id)
      initial[s.id] = existing?.status ?? 'present'
    })
    setMarkStatus(initial)
    setMarkMode(true)
  }

  // Mark all present shortcut
  function markAllPresent() {
    const all: Record<string, AttendanceStatus> = {}
    enrolledStudents.forEach(s => { all[s.id] = 'present' })
    setMarkStatus(all)
  }

  async function saveAttendance() {
    if (!myTeacher && role !== 'admin') {
      return toast.error('No teacher profile found for your account')
    }
    setSaving(true)
    try {
      await Promise.all(
        enrolledStudents.map(s =>
          api.post('/api/attendance', {
            student_id:  s.id,
            class_id:    selectedClass,
            date:        selectedDate,
            status:      markStatus[s.id] ?? 'present',
            recorded_by: myTeacher?.id ?? teachers[0]?.id,
          })
        )
      )
      toast.success('Attendance saved')
      setMarkMode(false)
      await loadAttendance()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  // Filter records for view mode
  const filtered = records.filter(r =>
    !filterStudent ||
    r.students?.users?.full_name?.toLowerCase().includes(filterStudent.toLowerCase())
  )

  // Stats
  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount  = records.filter(r => r.status === 'absent').length
  const lateCount    = records.filter(r => r.status === 'late').length
  const totalCount   = records.length

  const canMark = role === 'admin' || role === 'teacher'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-gray-500">Track and record student attendance</p>
        </div>
        {canMark && !markMode && (
          <button
            onClick={startMarkMode}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ✅ Mark Attendance
          </button>
        )}
        {canMark && markMode && (
          <div className="flex gap-2">
            <button
              onClick={() => setMarkMode(false)}
              className="px-3 py-1.5 border text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="border rounded-lg px-3 py-2 text-sm bg-white"
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
        >
          <option value="">— Select Class —</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} {c.section}</option>
          ))}
        </select>

        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm bg-white"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />

        {!markMode && (
          <input
            type="text"
            placeholder="Search student…"
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={filterStudent}
            onChange={e => setFilterStudent(e.target.value)}
          />
        )}
      </div>

      {/* Stats */}
      {records.length > 0 && !markMode && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',   value: totalCount,   color: 'bg-gray-50 border-gray-200 text-gray-700' },
            { label: 'Present', value: presentCount, color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Absent',  value: absentCount,  color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'Late',    value: lateCount,    color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`border rounded-xl px-3 py-3 text-center ${color}`}>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs mt-0.5 opacity-70">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Mark mode ── */}
      {markMode && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">
              Marking attendance for{' '}
              <strong>{classes.find(c => c.id === selectedClass)?.name}</strong>{' '}
              on <strong>{selectedDate}</strong>
            </div>
            <button
              onClick={markAllPresent}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              Mark all present
            </button>
          </div>

          {enrolledStudents.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              No students enrolled in this class
            </div>
          ) : (
            <div className="divide-y">
              {enrolledStudents.map(s => (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{s.users?.full_name}</div>
                    <div className="text-xs text-gray-500">{s.users?.email}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(status => (
                      <button
                        key={status}
                        onClick={() => setMarkStatus(prev => ({ ...prev, [s.id]: status }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border capitalize transition-colors ${
                          markStatus[s.id] === status
                            ? STATUS_STYLES[status]
                            : 'border-gray-200 text-gray-400 hover:border-gray-400'
                        }`}
                      >
                        {STATUS_ICONS[status]} {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── View mode ── */}
      {!markMode && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b text-sm text-gray-500">
            {loading ? 'Loading…' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[1,2,3,4].map(j => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                      No attendance records found
                      {canMark && (
                        <div className="mt-2">
                          <button
                            onClick={startMarkMode}
                            className="text-violet-600 hover:underline text-sm"
                          >
                            Mark attendance for {selectedDate}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.students?.users?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.classes?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[r.status]}`}>
                          {STATUS_ICONS[r.status]} {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}