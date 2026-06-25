import  { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'

interface Student {
  id: string
  user_id: string
  admission_number?: string
  date_of_birth?: string
  guardian_name?: string
  guardian_phone?: string
  guardian_email?: string
  enrollment_date?: string
  school_id?: string
  users: { id: string; email: string; full_name: string; role: string }
}

interface Class { id: string; name: string; section: string }
interface Enrollment {
  id: string; student_id: string; class_id: string | null
  classes: { name: string } | null
}

export default function StudentProfileEditor() {
  const [students,    setStudents]    = useState<Student[]>([])
  const [classes,     setClasses]     = useState<Class[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [selected,    setSelected]    = useState<Student | null>(null)
  const [form,        setForm]        = useState({
    admission_number: '', date_of_birth: '', guardian_name: '',
    guardian_phone: '', guardian_email: '', enrollment_date: '', school_id: '',
  })
  const [enrollClassId, setEnrollClassId] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [promoteClassId, setPromoteClassId] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/api/students'),
      api.get('/api/classes'),
      api.get('/api/enrollments'),
    ]).then(([st, cl, en]) => {
      setStudents(st.data?.value ?? st.data ?? [])
      setClasses(cl.data?.value ?? cl.data ?? [])
      setEnrollments(en.data?.value ?? en.data ?? [])
    }).catch(() => toast.error('Failed to load data'))
  }, [])

  function selectStudent(s: Student) {
    setSelected(s)
    setForm({
      admission_number: s.admission_number ?? '',
      date_of_birth:    s.date_of_birth ?? '',
      guardian_name:    s.guardian_name ?? '',
      guardian_phone:   s.guardian_phone ?? '',
      guardian_email:   s.guardian_email ?? '',
      enrollment_date:  s.enrollment_date ?? '',
      school_id:        s.school_id ?? '',
    })
    setEnrollClassId('')
    setPromoteClassId('')
  }

  async function saveProfile() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await api.put(`/api/students/${selected.id}`, form)
      toast.success('Profile updated')
      setSelected(res.data)
      const st = await api.get('/api/students')
      setStudents(st.data?.value ?? st.data ?? [])
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to update profile')
    } finally { setSaving(false) }
  }

  async function enrollStudent() {
    if (!selected || !enrollClassId) return toast.error('Select a class')
    setEnrolling(true)
    try {
      await api.post('/api/enrollments', {
        student_id: selected.id,
        class_id: enrollClassId,
      })
      toast.success('Student enrolled')
      const en = await api.get('/api/enrollments')
      setEnrollments(en.data?.value ?? en.data ?? [])
      setEnrollClassId('')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to enroll student')
    } finally { setEnrolling(false) }
  }

  async function promoteStudent() {
    if (!selected || !promoteClassId) return toast.error('Select a class to promote to')
    setPromoting(true)
    try {
      await api.post('/api/enrollments/promote', {
        student_id: selected.id,
        new_class_id: promoteClassId,
      })
      toast.success('Student promoted successfully')
      const en = await api.get('/api/enrollments')
      setEnrollments(en.data?.value ?? en.data ?? [])
      setPromoteClassId('')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to promote student')
    } finally { setPromoting(false) }
  }

  const studentEnrollments = selected
    ? enrollments.filter(e => e.student_id === selected.id)
    : []

  const unenrolled = students.filter(s =>
    !enrollments.some(e => e.student_id === s.id && e.class_id !== null)
  )

  const filtered = students.filter(s =>
    s.users?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.users?.email?.toLowerCase().includes(search.toLowerCase())
  )

  const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Student Profiles</h1>
        <p className="text-sm text-gray-500">Edit student details, enroll and promote students</p>
      </div>

      {/* Unenrolled alert */}
      {unenrolled.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          ⚠️ {unenrolled.length} student{unenrolled.length > 1 ? 's' : ''} not enrolled in any class:
          {' '}{unenrolled.map(s => s.users?.full_name).join(', ')}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Student list */}
        <div className="bg-white border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <input
              className={inp}
              placeholder="Search students…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto divide-y max-h-[60vh]">
            {filtered.map(s => {
              const enrolled = enrollments.filter(e => e.student_id === s.id && e.class_id)
              const hasClass = enrolled.length > 0
              return (
                <button
                  key={s.id}
                  onClick={() => selectStudent(s)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selected?.id === s.id ? 'bg-violet-50 border-l-2 border-l-violet-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-gray-900">{s.users?.full_name}</div>
                    {!hasClass && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">No class</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.users?.email}</div>
                  {hasClass && (
                    <div className="text-xs text-violet-600 mt-0.5">
                      {enrolled.map(e => e.classes?.name).join(', ')}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Edit form */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white border rounded-xl px-4 py-16 text-center text-gray-400">
              Select a student to edit
            </div>
          ) : (
            <>
              {/* Profile form */}
              <div className="bg-white border rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
                    {selected.users?.full_name?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold">{selected.users?.full_name}</div>
                    <div className="text-xs text-gray-500">{selected.users?.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                      Admission Number
                    </label>
                    <input className={inp} value={form.admission_number}
                      onChange={e => setForm(f => ({ ...f, admission_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                      Date of Birth
                    </label>
                    <input className={inp} type="date" value={form.date_of_birth}
                      onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                      Guardian Name
                    </label>
                    <input className={inp} value={form.guardian_name}
                      onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                      Guardian Phone
                    </label>
                    <input className={inp} value={form.guardian_phone}
                      onChange={e => setForm(f => ({ ...f, guardian_phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                      Guardian Email
                    </label>
                    <input className={inp} type="email" value={form.guardian_email}
                      onChange={e => setForm(f => ({ ...f, guardian_email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                      Enrollment Date
                    </label>
                    <input className={inp} type="date" value={form.enrollment_date}
                      onChange={e => setForm(f => ({ ...f, enrollment_date: e.target.value }))} />
                  </div>
                </div>

                <button onClick={saveProfile} disabled={saving}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg disabled:opacity-60 transition-colors">
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>

              {/* Current enrollments */}
              <div className="bg-white border rounded-xl p-5 space-y-3">
                <div className="font-medium text-sm text-gray-700">
                  Current Enrollments ({studentEnrollments.length})
                </div>
                {studentEnrollments.length === 0 ? (
                  <div className="text-sm text-gray-400">Not enrolled in any class</div>
                ) : (
                  <div className="space-y-2">
                    {studentEnrollments.map(e => (
                      <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium">
                          {e.classes?.name ?? <span className="text-red-500">No class assigned</span>}
                        </span>
                        <span className="text-xs text-gray-400">enrolled</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Enroll in class */}
                <div className="pt-3 border-t space-y-2">
                  <div className="text-sm font-medium text-gray-700">Enroll in a Class</div>
                  <div className="flex gap-2">
                    <select className={`flex-1 ${inp}`} value={enrollClassId}
                      onChange={e => setEnrollClassId(e.target.value)}>
                      <option value="">— Select Class —</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                      ))}
                    </select>
                    <button onClick={enrollStudent} disabled={enrolling}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg disabled:opacity-60 transition-colors">
                      {enrolling ? '…' : 'Enroll'}
                    </button>
                  </div>
                </div>

                {/* Promote to class */}
                <div className="pt-3 border-t space-y-2">
                  <div className="text-sm font-medium text-gray-700">Promote to New Class</div>
                  <p className="text-xs text-gray-400">Archives current enrollment and creates a new one</p>
                  <div className="flex gap-2">
                    <select className={`flex-1 ${inp}`} value={promoteClassId}
                      onChange={e => setPromoteClassId(e.target.value)}>
                      <option value="">— Select Class —</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                      ))}
                    </select>
                    <button onClick={promoteStudent} disabled={promoting}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg disabled:opacity-60 transition-colors">
                      {promoting ? '…' : 'Promote'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
