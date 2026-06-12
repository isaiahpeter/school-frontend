import  { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface School {
  id: string; name: string; address?: string; phone?: string; email?: string; created_at?: string
}
interface Term {
  id: string; name: string; academic_year: string; school_id: string; start_date?: string; end_date?: string
}
interface Class {
  id: string; name: string; section: string; academic_year: string; school_id: string
}
interface Teacher {
  id: string; user_id: string; employee_code?: string; specialization?: string; hire_date?: string; school_id: string
  users: { id: string; email: string; full_name: string; role: string }
}
interface Student {
  id: string; users: { full_name: string; email: string }
}
interface Subject {
  id: string; name: string; code: string; description?: string; school_id: string
}
interface Enrollment {
  id: string; student_id: string; class_id: string; enrollment_date: string; status: string
  students: { users: { full_name: string } }
  classes: { name: string }
}
interface GradeScale {
  id: number; min_percent: number; max_percent: number; grade: string; grade_point: number; remark: string
}

type Tab = 'overview' | 'schools' | 'terms' | 'classes' | 'teachers' | 'subjects' | 'enrollments' | 'grading'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {action}
    </div>
  )
}

function AddButton({ onClick, label = '+ Add' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
      {label}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const input = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"

function StatCard({ label, value, color = 'violet' }: { label: string; value: number | string; color?: string }) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
  }
  return (
    <div className={`border rounded-xl px-4 py-4 ${colors[color]}`}>
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')

  const [schools,     setSchools]     = useState<School[]>([])
  const [terms,       setTerms]       = useState<Term[]>([])
  const [classes,     setClasses]     = useState<Class[]>([])
  const [teachers,    setTeachers]    = useState<Teacher[]>([])
  const [students,    setStudents]    = useState<Student[]>([])
  const [subjects,    setSubjects]    = useState<Subject[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [grades,      setGrades]      = useState<GradeScale[]>([])

  // Modal state
  const [showSchoolModal,     setShowSchoolModal]     = useState(false)
  const [showTermModal,       setShowTermModal]       = useState(false)
  const [showEnrollModal,     setShowEnrollModal]     = useState(false)
  const [showSubjectModal,    setShowSubjectModal]    = useState(false)

  // Form state
  const [schoolForm,  setSchoolForm]  = useState({ name: '', address: '', phone: '', email: '' })
  const [termForm,    setTermForm]    = useState({ name: '', academic_year: '', school_id: '', start_date: '', end_date: '' })
  const [enrollForm,  setEnrollForm]  = useState({ student_id: '', class_id: '' })
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', description: '' })
  const [saving, setSaving] = useState(false)

  // Load all data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [sc, te, cl, th, st, su, en, gr] = await Promise.all([
          api.get('/api/schools'),
          api.get('/api/terms'),
          api.get('/api/classes'),
          api.get('/api/teachers'),
          api.get('/api/students'),
          api.get('/api/subjects'),
          api.get('/api/enrollments'),
          api.get('/api/grades'),
        ])
        setSchools(sc.data?.value ?? sc.data ?? [])
        setTerms(te.data?.value ?? te.data ?? [])
        setClasses(cl.data?.value ?? cl.data ?? [])
        setTeachers(th.data?.value ?? th.data ?? [])
        setStudents(st.data?.value ?? st.data ?? [])
        setSubjects(su.data?.value ?? su.data ?? [])
        setEnrollments(en.data?.value ?? en.data ?? [])
        setGrades(gr.data?.value ?? gr.data ?? [])
      } catch {
        toast.error('Failed to load admin data')
      }
    }
    load()
  }, [])

  // ── Create school ──
  async function createSchool() {
    if (!schoolForm.name.trim()) return toast.error('School name is required')
    setSaving(true)
    try {
      await api.post('/api/schools', schoolForm)
      toast.success('School created')
      const res = await api.get('/api/schools')
      setSchools(res.data?.value ?? res.data ?? [])
      setShowSchoolModal(false)
      setSchoolForm({ name: '', address: '', phone: '', email: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create school')
    } finally { setSaving(false) }
  }

  // ── Create term ──
  async function createTerm() {
    if (!termForm.name.trim() || !termForm.academic_year.trim() || !termForm.school_id)
      return toast.error('Name, academic year and school are required')
    setSaving(true)
    try {
      await api.post('/api/terms', termForm)
      toast.success('Term created')
      const res = await api.get('/api/terms')
      setTerms(res.data?.value ?? res.data ?? [])
      setShowTermModal(false)
      setTermForm({ name: '', academic_year: '', school_id: '', start_date: '', end_date: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create term')
    } finally { setSaving(false) }
  }

  // ── Create subject ──
  async function createSubject() {
    if (!subjectForm.name.trim() || !subjectForm.code.trim())
      return toast.error('Name and code are required')
    
    // Get school_id from first school
    const school_id = schools[0]?.id
    if (!school_id) return toast.error('No school found')
    
    setSaving(true)
    try {
      await api.post('/api/subjects', {
        name: subjectForm.name.trim().toUpperCase(),
        code: subjectForm.code.trim().toUpperCase(),
        description: subjectForm.description.trim() || undefined,
        school_id,
      })
      toast.success('Subject created')
      const res = await api.get('/api/subjects')
      setSubjects(res.data?.value ?? res.data ?? [])
      setShowSubjectModal(false)
      setSubjectForm({ name: '', code: '', description: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to create subject')
    } finally { setSaving(false) }
  }

  // ── Create enrollment ──
  async function createEnrollment() {
    if (!enrollForm.student_id || !enrollForm.class_id)
      return toast.error('Select both student and class')
    setSaving(true)
    try {
      await api.post('/api/enrollments', enrollForm)
      toast.success('Student enrolled')
      const res = await api.get('/api/enrollments')
      setEnrollments(res.data?.value ?? res.data ?? [])
      setShowEnrollModal(false)
      setEnrollForm({ student_id: '', class_id: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to enroll student')
    } finally { setSaving(false) }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview' },
    { key: 'schools',      label: 'Schools' },
    { key: 'terms',        label: 'Terms' },
    { key: 'classes',      label: 'Classes' },
    { key: 'teachers',     label: 'Teachers' },
    { key: 'subjects',     label: 'Subjects' },
    { key: 'enrollments',  label: 'Enrollments' },
    { key: 'grading',      label: 'Grading Scale' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-gray-500">Manage schools, terms, classes, teachers and more</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Schools"     value={schools.length}     color="violet" />
          <StatCard label="Terms"       value={terms.length}       color="blue" />
          <StatCard label="Classes"     value={classes.length}     color="green" />
          <StatCard label="Teachers"    value={teachers.length}    color="amber" />
          <StatCard label="Students"    value={students.length}    color="pink" />
          <StatCard label="Subjects"    value={subjects.length}    color="violet" />
          <StatCard label="Enrollments" value={enrollments.length} color="blue" />
        </div>
      )}

      {/* ── Schools ── */}
      {tab === 'schools' && (
        <>
          <SectionHeader title="Schools" action={<AddButton onClick={() => setShowSchoolModal(true)} />} />
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schools.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showSchoolModal && (
            <Modal title="Create School" onClose={() => setShowSchoolModal(false)}>
              <Field label="School Name *">
                <input className={input} value={schoolForm.name}
                  onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Email">
                <input className={input} type="email" value={schoolForm.email}
                  onChange={e => setSchoolForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Phone">
                <input className={input} value={schoolForm.phone}
                  onChange={e => setSchoolForm(f => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Address">
                <input className={input} value={schoolForm.address}
                  onChange={e => setSchoolForm(f => ({ ...f, address: e.target.value }))} />
              </Field>
              <button onClick={createSchool} disabled={saving}
                className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Creating…' : 'Create School'}
              </button>
            </Modal>
          )}
        </>
      )}

      {/* ── Terms ── */}
      {tab === 'terms' && (
        <>
          <SectionHeader title="Terms" action={<AddButton onClick={() => setShowTermModal(true)} />} />
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Academic Year</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {terms.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.academic_year}</td>
                    <td className="px-4 py-3 text-gray-600">{t.start_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{t.end_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showTermModal && (
            <Modal title="Create Term" onClose={() => setShowTermModal(false)}>
              <Field label="Term Name *">
                <input className={input} placeholder="e.g. First Term" value={termForm.name}
                  onChange={e => setTermForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Academic Year *">
                <input className={input} placeholder="e.g. 2025/26" value={termForm.academic_year}
                  onChange={e => setTermForm(f => ({ ...f, academic_year: e.target.value }))} />
              </Field>
              <Field label="School *">
                <select className={input} value={termForm.school_id}
                  onChange={e => setTermForm(f => ({ ...f, school_id: e.target.value }))}>
                  <option value="">— Select School —</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Start Date">
                <input className={input} type="date" value={termForm.start_date}
                  onChange={e => setTermForm(f => ({ ...f, start_date: e.target.value }))} />
              </Field>
              <Field label="End Date">
                <input className={input} type="date" value={termForm.end_date}
                  onChange={e => setTermForm(f => ({ ...f, end_date: e.target.value }))} />
              </Field>
              <button onClick={createTerm} disabled={saving}
                className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Creating…' : 'Create Term'}
              </button>
            </Modal>
          )}
        </>
      )}

      {/* ── Classes ── */}
      {tab === 'classes' && (
        <>
          <SectionHeader title="Classes" />
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Academic Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.section}</td>
                    <td className="px-4 py-3 text-gray-600">{c.academic_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Teachers ── */}
      {tab === 'teachers' && (
        <>
          <SectionHeader title="Teachers" />
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Employee Code</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3">Hire Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.users?.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.users?.email}</td>
                    <td className="px-4 py-3 text-gray-600">{t.employee_code || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{t.specialization || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{t.hire_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Subjects ── */}
      {tab === 'subjects' && (
        <>
          <SectionHeader title="Subjects" action={<AddButton onClick={() => setShowSubjectModal(true)} />} />
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded">
                        {s.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showSubjectModal && (
            <Modal title="Create Subject" onClose={() => setShowSubjectModal(false)}>
              <Field label="Subject Name *">
                <input className={input} placeholder="e.g. BASIC TECHNOLOGY"
                  value={subjectForm.name}
                  onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Subject Code *">
                <input className={input} placeholder="e.g. BTECH (must be unique)"
                  value={subjectForm.code}
                  onChange={e => setSubjectForm(f => ({ ...f, code: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">Code is auto-uppercased and must be unique</p>
              </Field>
              <Field label="Description">
                <input className={input} placeholder="Optional description"
                  value={subjectForm.description}
                  onChange={e => setSubjectForm(f => ({ ...f, description: e.target.value }))} />
              </Field>
              <button onClick={createSubject} disabled={saving}
                className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Creating…' : 'Create Subject'}
              </button>
            </Modal>
          )}
        </>
      )}

      {/* ── Enrollments ── */}
      {tab === 'enrollments' && (
        <>
          <SectionHeader title="Enrollments"
            action={<AddButton onClick={() => setShowEnrollModal(true)} label="+ Enroll Student" />} />
          <div className="bg-white border rounded-xl overflow-hidden">
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
                {enrollments.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.students?.users?.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{e.classes?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{e.enrollment_date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        e.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showEnrollModal && (
            <Modal title="Enroll Student" onClose={() => setShowEnrollModal(false)}>
              <Field label="Student *">
                <select className={input} value={enrollForm.student_id}
                  onChange={e => setEnrollForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">— Select Student —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.users?.full_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Class *">
                <select className={input} value={enrollForm.class_id}
                  onChange={e => setEnrollForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">— Select Class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                  ))}
                </select>
              </Field>
              <button onClick={createEnrollment} disabled={saving}
                className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Enrolling…' : 'Enroll Student'}
              </button>
            </Modal>
          )}
        </>
      )}

      {/* ── Grading Scale ── */}
      {tab === 'grading' && (
        <>
          <SectionHeader title="Grading Scale" />
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Min %</th>
                  <th className="px-4 py-3">Max %</th>
                  <th className="px-4 py-3">Grade Point</th>
                  <th className="px-4 py-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...grades].sort((a, b) => b.min_percent - a.min_percent).map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        g.grade === 'A+' ? 'bg-emerald-100 text-emerald-700' :
                        g.grade === 'A'  ? 'bg-green-100 text-green-700' :
                        g.grade === 'B'  ? 'bg-blue-100 text-blue-700' :
                        g.grade === 'C'  ? 'bg-yellow-100 text-yellow-700' :
                        g.grade === 'D'  ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>{g.grade}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{g.min_percent}%</td>
                    <td className="px-4 py-3 text-gray-600">{g.max_percent}%</td>
                    <td className="px-4 py-3 text-gray-600">{g.grade_point}</td>
                    <td className="px-4 py-3 text-gray-600">{g.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}