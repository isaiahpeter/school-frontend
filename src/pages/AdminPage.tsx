import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface School { id: string; name: string; address?: string; phone?: string; email?: string }
interface Term { id: string; name: string; academic_year: string; school_id: string; start_date?: string; end_date?: string }
interface Class { id: string; name: string; section: string; academic_year: string; school_id: string }
interface Teacher { id: string; user_id: string; employee_code?: string; specialization?: string; hire_date?: string; school_id: string; users: { id: string; email: string; full_name: string; role: string } }
interface Student { id: string; users: { full_name: string; email: string }; admission_number?: string; enrollment_date?: string }
interface Subject { id: string; name: string; code: string; description?: string; school_id: string }
interface Enrollment { id: string; student_id: string; class_id: string; enrollment_date: string; status: string; students: { users: { full_name: string } }; classes: { name: string } }
interface GradeScale { id: number; min_percent: number; max_percent: number; grade: string; grade_point: number; remark: string }
interface User { id: string; email: string; full_name: string; role: string; created_at: string; telegram_chat_id?: string | null }

type Tab = 'overview' | 'schools' | 'terms' | 'classes' | 'teachers' | 'subjects' | 'enrollments' | 'grading' | 'discounts' | 'fees' | 'users' | 'students'

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
    <button onClick={onClick} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
      {label}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
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
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    pink:   'bg-pink-50 border-pink-200 text-pink-700',
  }
  return (
    <div className={`border rounded-xl px-4 py-4 ${colors[color]}`}>
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  )
}

const API_BASE = 'https://school-api-e09o.onrender.com'

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
  const [users,       setUsers]       = useState<User[]>([])

  // ── Modal visibility ──
  const [showSchoolModal,   setShowSchoolModal]   = useState(false)
  const [showTermModal,     setShowTermModal]      = useState(false)
  const [showEnrollModal,   setShowEnrollModal]    = useState(false)
  const [showSubjectModal,  setShowSubjectModal]   = useState(false)
  const [showClassModal,    setShowClassModal]     = useState(false)
  const [showPromoteModal,  setShowPromoteModal]   = useState(false)
  const [showDiscountModal, setShowDiscountModal]  = useState(false)

  // ── Form state ──
  const [schoolForm,      setSchoolForm]      = useState({ name: '', address: '', phone: '', email: '' })
  const [termForm,        setTermForm]        = useState({ name: '', academic_year: '', school_id: '', start_date: '', end_date: '' })
  const [enrollForm,      setEnrollForm]      = useState({ student_id: '', class_id: '' })
  const [subjectForm,     setSubjectForm]     = useState({ name: '', code: '', description: '' })
  const [classForm,       setClassForm]       = useState({ name: '', section: '', academic_year: '' })
  const [promoteStudentId,   setPromoteStudentId]   = useState('')
  const [promoteNewClassId,  setPromoteNewClassId]  = useState('')

  // Discounts
  const [discountStudentId, setDiscountStudentId] = useState('')
  const [discountTermId,    setDiscountTermId]    = useState('')
  const [discountType,      setDiscountType]      = useState<'fixed'|'percentage'>('fixed')
  const [discountValue,     setDiscountValue]     = useState('')
  const [discountReason,    setDiscountReason]    = useState('')
  const [discountData,      setDiscountData]      = useState<any>(null)
  const [loadingDiscount,   setLoadingDiscount]   = useState(false)

  // Fee items
  const [feeClass, setFeeClass] = useState('')
  const [feeTerm,  setFeeTerm]  = useState('')
  const [feeItems, setFeeItems] = useState([{ item_name: '', amount: '', category: 'tuition' as 'tuition'|'admission'|'other'|'extra' }])

  // Users
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newPassword,    setNewPassword]    = useState('')
  const [newRole,        setNewRole]        = useState('student')
  const [userActionTab,  setUserActionTab]  = useState<'password'|'role'|'delete'>('password')
  const [linkParentForm, setLinkParentForm] = useState({ parent_user_id: '', student_id: '' })
  const [userSearchTerm, setUserSearchTerm] = useState('')

  const [saving, setSaving] = useState(false)

  // ── Load all data ──
  useEffect(() => {
    const load = async () => {
      try {
        const [sc, te, cl, th, st, su, en, gr, us] = await Promise.all([
          api.get('/api/schools'),
          api.get('/api/terms'),
          api.get('/api/classes'),
          api.get('/api/teachers'),
          api.get('/api/students'),
          api.get('/api/subjects'),
          api.get('/api/enrollments'),
          api.get('/api/grades'),
          api.get('/api/users'),
        ])
        setSchools(sc.data?.value ?? sc.data ?? [])
        setTerms(te.data?.value ?? te.data ?? [])
        setClasses(cl.data?.value ?? cl.data ?? [])
        setTeachers(th.data?.value ?? th.data ?? [])
        setStudents(st.data?.value ?? st.data ?? [])
        setSubjects(su.data?.value ?? su.data ?? [])
        setEnrollments(en.data?.value ?? en.data ?? [])
        setGrades(gr.data?.value ?? gr.data ?? [])
        setUsers(us.data ?? [])
      } catch {
        toast.error('Failed to load admin data')
      }
    }
    load()
  }, [])

  // ── School ──
  async function createSchool() {
    if (!schoolForm.name.trim()) return toast.error('School name required')
    setSaving(true)
    try {
      await api.post('/api/schools', schoolForm)
      toast.success('School created')
      const res = await api.get('/api/schools')
      setSchools(res.data?.value ?? res.data ?? [])
      setShowSchoolModal(false)
      setSchoolForm({ name: '', address: '', phone: '', email: '' })
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  // ── Term ──
  async function createTerm() {
    if (!termForm.name.trim() || !termForm.academic_year.trim() || !termForm.school_id)
      return toast.error('Name, academic year and school required')
    setSaving(true)
    try {
      await api.post('/api/terms', termForm)
      toast.success('Term created')
      const res = await api.get('/api/terms')
      setTerms(res.data?.value ?? res.data ?? [])
      setShowTermModal(false)
      setTermForm({ name: '', academic_year: '', school_id: '', start_date: '', end_date: '' })
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  // ── Class ──
  async function createClass() {
    if (!classForm.name.trim() || !classForm.section.trim() || !classForm.academic_year.trim())
      return toast.error('Name, section and academic year required')
    const school_id = schools[0]?.id
    if (!school_id) return toast.error('No school found')
    setSaving(true)
    try {
      await api.post('/api/classes', {
        ...classForm, school_id,
        name:    classForm.name.toUpperCase(),
        section: classForm.section.toUpperCase(),
      })
      toast.success('Class created')
      const res = await api.get('/api/classes')
      setClasses(res.data?.value ?? res.data ?? [])
      setShowClassModal(false)
      setClassForm({ name: '', section: '', academic_year: '' })
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  // ── Subject ──
  async function createSubject() {
    if (!subjectForm.name.trim() || !subjectForm.code.trim())
      return toast.error('Name and code required')
    const school_id = schools[0]?.id
    if (!school_id) return toast.error('No school found')
    setSaving(true)
    try {
      await api.post('/api/subjects', {
        name:        subjectForm.name.toUpperCase(),
        code:        subjectForm.code.toUpperCase(),
        description: subjectForm.description,
        school_id,
      })
      toast.success('Subject created')
      const res = await api.get('/api/subjects')
      setSubjects(res.data?.value ?? res.data ?? [])
      setShowSubjectModal(false)
      setSubjectForm({ name: '', code: '', description: '' })
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  // ── Enrollment ──
  async function createEnrollment() {
    if (!enrollForm.student_id || !enrollForm.class_id)
      return toast.error('Select student and class')
    setSaving(true)
    try {
      await api.post('/api/enrollments', enrollForm)
      toast.success('Student enrolled')
      const res = await api.get('/api/enrollments')
      setEnrollments(res.data?.value ?? res.data ?? [])
      setShowEnrollModal(false)
      setEnrollForm({ student_id: '', class_id: '' })
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  // ── Promote ──
  async function promoteStudent() {
    if (!promoteStudentId || !promoteNewClassId)
      return toast.error('Select student and new class')
    setSaving(true)
    try {
      await api.post('/api/enrollments/promote', {
        student_id: promoteStudentId,
        new_class_id: promoteNewClassId,
      })
      toast.success('Student promoted')
      setShowPromoteModal(false)
      setPromoteStudentId('')
      setPromoteNewClassId('')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  // ── Discounts ──
  async function fetchDiscount() {
    if (!discountStudentId || !discountTermId) return
    setLoadingDiscount(true)
    try {
      const res = await api.get('/api/discounts', {
        params: { student_id: discountStudentId, term_id: discountTermId },
      })
      setDiscountData(res.data)
    } catch { setDiscountData(null) }
    finally { setLoadingDiscount(false) }
  }

  async function saveDiscount() {
    if (!discountStudentId || !discountTermId || !discountValue)
      return toast.error('Fill required fields')
    setSaving(true)
    try {
      await api.post('/api/discounts', {
        student_id:     discountStudentId,
        term_id:        discountTermId,
        discount_type:  discountType,
        discount_value: Number(discountValue),
        reason:         discountReason || undefined,
      })
      toast.success('Discount saved')
      await fetchDiscount()
      setShowDiscountModal(false)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  async function deleteDiscount() {
    if (!discountData?.id) return
    if (!confirm('Remove this discount?')) return
    try {
      await api.delete(`/api/discounts/${discountData.id}`)
      toast.success('Discount removed')
      setDiscountData(null)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
  }

  // ── Fees ──
  async function saveFeeItems() {
    if (!feeClass || !feeTerm) return toast.error('Select class and term')
    const filled = feeItems.filter(i => i.item_name.trim() && i.amount)
    if (filled.length === 0) return toast.error('Add at least one fee item')
    setSaving(true)
    try {
      await api.post('/api/fees/items', {
        class_id: feeClass,
        term_id:  feeTerm,
        items: filled.map(i => ({
          item_name: i.item_name.trim(),
          amount:    Number(i.amount),
          category:  i.category,
        })),
      })
      toast.success('Fee items saved')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  // ── Users ──
  async function changePassword() {
    if (!selectedUserId || !newPassword.trim()) return toast.error('Select user and enter password')
    if (newPassword.length < 6) return toast.error('Min 6 characters')
    setSaving(true)
    try {
      await api.put(`/api/users/${selectedUserId}/password`, { newPassword })
      toast.success('Password updated')
      setNewPassword('')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  async function changeRole() {
    if (!selectedUserId) return toast.error('Select user')
    setSaving(true)
    try {
      await api.put(`/api/users/${selectedUserId}/role`, { role: newRole })
      toast.success('Role updated')
      const res = await api.get('/api/users')
      setUsers(res.data ?? [])
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  async function deleteUser() {
    if (!selectedUserId) return toast.error('Select user')
    if (!confirm('Delete this user permanently?')) return
    setSaving(true)
    try {
      await api.delete(`/api/users/${selectedUserId}`)
      toast.success('User deleted')
      setSelectedUserId('')
      const res = await api.get('/api/users')
      setUsers(res.data ?? [])
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  async function linkParent() {
    if (!linkParentForm.parent_user_id || !linkParentForm.student_id)
      return toast.error('Select parent and student')
    setSaving(true)
    try {
      await api.post('/api/users/link-parent', linkParentForm)
      toast.success('Parent linked to student')
      setLinkParentForm({ parent_user_id: '', student_id: '' })
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  function copyPDFLink(studentId: string, studentName: string) {
    const link = `${API_BASE}/api/results/report/${studentId}/latest`
    navigator.clipboard.writeText(link)
      .then(() => toast.success(`PDF link copied for ${studentName}`))
      .catch(() => toast.error('Failed to copy link'))
  }

  // ── Tabs ──
  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',    label: '📊 Overview' },
    { key: 'schools',     label: '🏫 Schools' },
    { key: 'terms',       label: '📅 Terms' },
    { key: 'classes',     label: '🎓 Classes' },
    { key: 'teachers',    label: '👩‍🏫 Teachers' },
    { key: 'students',    label: '👨‍🎓 Students' },
    { key: 'subjects',    label: '📚 Subjects' },
    { key: 'enrollments', label: '📋 Enrollments' },
    { key: 'grading',     label: '🏆 Grading' },
    { key: 'discounts',   label: '🏷 Discounts' },
    { key: 'fees',        label: '💰 Set Fees' },
    { key: 'users',       label: '👤 Users' },
  ]

  // ── Filtered users (for search) ──────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-gray-500">Manage schools, terms, classes, teachers and more</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Schools"     value={schools.length}     color="violet" />
          <StatCard label="Terms"       value={terms.length}       color="blue" />
          <StatCard label="Classes"     value={classes.length}     color="green" />
          <StatCard label="Teachers"    value={teachers.length}    color="amber" />
          <StatCard label="Students"    value={students.length}    color="pink" />
          <StatCard label="Subjects"    value={subjects.length}    color="violet" />
          <StatCard label="Enrollments" value={enrollments.length} color="blue" />
          <StatCard label="Users"       value={users.length}       color="green" />
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
                {schools.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No schools yet</td></tr>
                ) : schools.map(s => (
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
              <Field label="School Name *"><input className={input} value={schoolForm.name} onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))} /></Field>
              <Field label="Email"><input className={input} type="email" value={schoolForm.email} onChange={e => setSchoolForm(f => ({ ...f, email: e.target.value }))} /></Field>
              <Field label="Phone"><input className={input} value={schoolForm.phone} onChange={e => setSchoolForm(f => ({ ...f, phone: e.target.value }))} /></Field>
              <Field label="Address"><input className={input} value={schoolForm.address} onChange={e => setSchoolForm(f => ({ ...f, address: e.target.value }))} /></Field>
              <button onClick={createSchool} disabled={saving} className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
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
                {terms.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No terms yet</td></tr>
                ) : terms.map(t => (
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
              <Field label="Term Name *"><input className={input} placeholder="e.g. First Term" value={termForm.name} onChange={e => setTermForm(f => ({ ...f, name: e.target.value }))} /></Field>
              <Field label="Academic Year *"><input className={input} placeholder="e.g. 2025/26" value={termForm.academic_year} onChange={e => setTermForm(f => ({ ...f, academic_year: e.target.value }))} /></Field>
              <Field label="School *">
                <select className={input} value={termForm.school_id} onChange={e => setTermForm(f => ({ ...f, school_id: e.target.value }))}>
                  <option value="">— Select School —</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Start Date"><input className={input} type="date" value={termForm.start_date} onChange={e => setTermForm(f => ({ ...f, start_date: e.target.value }))} /></Field>
              <Field label="End Date"><input className={input} type="date" value={termForm.end_date} onChange={e => setTermForm(f => ({ ...f, end_date: e.target.value }))} /></Field>
              <button onClick={createTerm} disabled={saving} className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Creating…' : 'Create Term'}
              </button>
            </Modal>
          )}
        </>
      )}

      {/* ── Classes ── */}
      {tab === 'classes' && (
        <>
          <SectionHeader title="Classes" action={<AddButton onClick={() => setShowClassModal(true)} />} />
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
                {classes.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No classes yet</td></tr>
                ) : classes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.section}</td>
                    <td className="px-4 py-3 text-gray-600">{c.academic_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showClassModal && (
            <Modal title="Create Class" onClose={() => setShowClassModal(false)}>
              <Field label="Class Name *"><input className={input} placeholder="e.g. GRADE FIVE" value={classForm.name} onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))} /></Field>
              <Field label="Section *"><input className={input} placeholder="e.g. A" value={classForm.section} onChange={e => setClassForm(f => ({ ...f, section: e.target.value }))} /></Field>
              <Field label="Academic Year *"><input className={input} placeholder="e.g. 2025/26" value={classForm.academic_year} onChange={e => setClassForm(f => ({ ...f, academic_year: e.target.value }))} /></Field>
              <button onClick={createClass} disabled={saving} className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Creating…' : 'Create Class'}
              </button>
            </Modal>
          )}
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
                {teachers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No teachers yet</td></tr>
                ) : teachers.map(t => (
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

      {/* ── Students ── */}
      {tab === 'students' && (
        <>
          <SectionHeader
            title="Students"
            action={
              <div className="flex gap-2">
                <AddButton onClick={() => setShowPromoteModal(true)} label="⬆ Promote" />
              </div>
            }
          />
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Admission No.</th>
                    <th className="px-4 py-3">Enrollment Date</th>
                    <th className="px-4 py-3">Report PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No students yet</td></tr>
                  ) : students.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.users?.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.users?.email}</td>
                      <td className="px-4 py-3 text-gray-600">{s.admission_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.enrollment_date || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyPDFLink(s.id, s.users?.full_name)}
                          className="text-xs text-violet-600 hover:text-violet-800 hover:underline whitespace-nowrap"
                          title="Copy PDF download link for latest term"
                        >
                          📄 Copy PDF Link
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showPromoteModal && (
            <Modal title="Promote Student" onClose={() => setShowPromoteModal(false)}>
              <Field label="Student *">
                <select className={input} value={promoteStudentId} onChange={e => setPromoteStudentId(e.target.value)}>
                  <option value="">— Select Student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.users?.full_name}</option>)}
                </select>
              </Field>
              <Field label="New Class *">
                <select className={input} value={promoteNewClassId} onChange={e => setPromoteNewClassId(e.target.value)}>
                  <option value="">— Select Class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                </select>
              </Field>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
                This will archive the current enrollment and create a new one in the selected class.
              </div>
              <button onClick={promoteStudent} disabled={saving} className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Promoting…' : 'Promote Student'}
              </button>
            </Modal>
          )}
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
                {subjects.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No subjects yet</td></tr>
                ) : subjects.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{s.code}</span></td>
                    <td className="px-4 py-3 text-gray-600">{s.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showSubjectModal && (
            <Modal title="Create Subject" onClose={() => setShowSubjectModal(false)}>
              <Field label="Subject Name *"><input className={input} placeholder="e.g. MATHEMATICS" value={subjectForm.name} onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))} /></Field>
              <Field label="Subject Code *"><input className={input} placeholder="e.g. MATH" value={subjectForm.code} onChange={e => setSubjectForm(f => ({ ...f, code: e.target.value }))} /></Field>
              <Field label="Description"><input className={input} value={subjectForm.description} onChange={e => setSubjectForm(f => ({ ...f, description: e.target.value }))} /></Field>
              <button onClick={createSubject} disabled={saving} className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Creating…' : 'Create Subject'}
              </button>
            </Modal>
          )}
        </>
      )}

      {/* ── Enrollments ── */}
      {tab === 'enrollments' && (
        <>
          <SectionHeader title="Enrollments" action={<AddButton onClick={() => setShowEnrollModal(true)} label="+ Enroll Student" />} />
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
                {enrollments.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No enrollments yet</td></tr>
                ) : enrollments.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.students?.users?.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{e.classes?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{e.enrollment_date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
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
                <select className={input} value={enrollForm.student_id} onChange={e => setEnrollForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">— Select Student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.users?.full_name}</option>)}
                </select>
              </Field>
              <Field label="Class *">
                <select className={input} value={enrollForm.class_id} onChange={e => setEnrollForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">— Select Class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                </select>
              </Field>
              <button onClick={createEnrollment} disabled={saving} className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
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

      {/* ── Discounts ── */}
      {tab === 'discounts' && (
        <>
          <SectionHeader title="Fee Discounts" action={<AddButton onClick={() => setShowDiscountModal(true)} label="+ Set Discount" />} />
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <div className="text-sm font-medium text-gray-700">Look up existing discount</div>
            <div className="flex flex-wrap gap-3">
              <select className={input} value={discountStudentId} onChange={e => setDiscountStudentId(e.target.value)}>
                <option value="">— Select Student —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.users?.full_name}</option>)}
              </select>
              <select className={input} value={discountTermId} onChange={e => setDiscountTermId(e.target.value)}>
                <option value="">— Select Term —</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>)}
              </select>
              <button onClick={fetchDiscount} disabled={loadingDiscount}
                className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors">
                {loadingDiscount ? 'Loading…' : 'Fetch'}
              </button>
            </div>
            {discountData && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-amber-800">
                    {discountData.discount_type === 'percentage'
                      ? `${discountData.discount_value}% discount`
                      : `₦${Number(discountData.discount_value).toLocaleString()} discount`}
                  </div>
                  {discountData.reason && <div className="text-sm text-amber-600 mt-0.5">{discountData.reason}</div>}
                </div>
                <button onClick={deleteDiscount}
                  className="text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors">
                  Remove
                </button>
              </div>
            )}
            {discountData === null && discountStudentId && discountTermId && !loadingDiscount && (
              <div className="text-sm text-gray-400">No discount found for this student/term</div>
            )}
          </div>
          {showDiscountModal && (
            <Modal title="Set Discount" onClose={() => setShowDiscountModal(false)}>
              <Field label="Student *">
                <select className={input} value={discountStudentId} onChange={e => setDiscountStudentId(e.target.value)}>
                  <option value="">— Select —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.users?.full_name}</option>)}
                </select>
              </Field>
              <Field label="Term *">
                <select className={input} value={discountTermId} onChange={e => setDiscountTermId(e.target.value)}>
                  <option value="">— Select —</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>)}
                </select>
              </Field>
              <Field label="Discount Type *">
                <select className={input} value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <option value="fixed">Fixed Amount (₦)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </Field>
              <Field label={`Value ${discountType === 'percentage' ? '(%)' : '(₦)'} *`}>
                <input className={input} type="number" min={0} value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
              </Field>
              <Field label="Reason">
                <input className={input} placeholder="e.g. Sibling discount" value={discountReason} onChange={e => setDiscountReason(e.target.value)} />
              </Field>
              <button onClick={saveDiscount} disabled={saving} className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Saving…' : 'Save Discount'}
              </button>
            </Modal>
          )}
        </>
      )}

      {/* ── Set Fees ── */}
      {tab === 'fees' && (
        <>
          <SectionHeader title="Set Fee Items" />
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Class *</label>
                <select className={input} value={feeClass} onChange={e => setFeeClass(e.target.value)}>
                  <option value="">— Select —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Term *</label>
                <select className={input} value={feeTerm} onChange={e => setFeeTerm(e.target.value)}>
                  <option value="">— Select —</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Fee Items</span>
                <button
                  onClick={() => setFeeItems(f => [...f, { item_name: '', amount: '', category: 'other' }])}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                >
                  + Add Row
                </button>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <span className="col-span-5">Item Name</span>
                <span className="col-span-3">Amount (₦)</span>
                <span className="col-span-3">Category</span>
                <span className="col-span-1"></span>
              </div>
              {feeItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input className={`col-span-5 ${input}`} placeholder="e.g. Tuition"
                    value={item.item_name}
                    onChange={e => setFeeItems(f => f.map((x, i) => i === idx ? { ...x, item_name: e.target.value } : x))} />
                  <input className={`col-span-3 ${input}`} type="number" min={0} placeholder="0"
                    value={item.amount}
                    onChange={e => setFeeItems(f => f.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))} />
                  <select className={`col-span-3 ${input}`} value={item.category}
                    onChange={e => setFeeItems(f => f.map((x, i) => i === idx ? { ...x, category: e.target.value as any } : x))}>
                    <option value="tuition">Tuition</option>
                    <option value="admission">Admission</option>
                    <option value="other">Other</option>
                    <option value="extra">Extra</option>
                  </select>
                  {feeItems.length > 1 && (
                    <button onClick={() => setFeeItems(f => f.filter((_, i) => i !== idx))}
                      className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t text-sm font-medium text-gray-700 flex justify-between">
                <span>Total</span>
                <span>₦{feeItems.reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString()}</span>
              </div>
            </div>
            <button onClick={saveFeeItems} disabled={saving}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save Fee Items'}
            </button>
          </div>
        </>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <>
          <SectionHeader title="User Management" />
          <div className="bg-white border rounded-xl p-5 space-y-4 max-w-lg">
            {/* Search box */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
              <input
                type="text"
                className={input}
                placeholder="Type a name or email…"
                value={userSearchTerm}
                onChange={e => { setUserSearchTerm(e.target.value); setSelectedUserId('') }}
              />
              {userSearchTerm && (
                <div className="text-xs text-gray-400 mt-1">
                  {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''} found
                </div>
              )}
            </div>

            <Field label="Select User *">
              <select className={input} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                <option value="">— Choose a user —</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role}) – {u.email}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex gap-1 border-b">
              {(['password', 'role', 'delete'] as const).map(t => (
                <button key={t} onClick={() => setUserActionTab(t)}
                  className={`px-3 py-1.5 text-sm font-medium border-b-2 capitalize transition-colors ${
                    userActionTab === t
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}>
                  {t === 'password' ? '🔑 Password' : t === 'role' ? '👤 Role' : '🗑 Delete'}
                </button>
              ))}
            </div>

            {userActionTab === 'password' && (
              <>
                <Field label="New Password *">
                  <input className={input} type="password" placeholder="Min. 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </Field>
                <button onClick={changePassword} disabled={saving}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                  {saving ? 'Updating…' : 'Update Password'}
                </button>
              </>
            )}
            {userActionTab === 'role' && (
              <>
                <Field label="New Role *">
                  <select className={input} value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                  </select>
                </Field>
                <button onClick={changeRole} disabled={saving}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                  {saving ? 'Updating…' : 'Update Role'}
                </button>
              </>
            )}
            {userActionTab === 'delete' && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  ⚠️ This action is permanent and cannot be undone.
                </div>
                <button onClick={deleteUser} disabled={saving}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                  {saving ? 'Deleting…' : 'Delete User'}
                </button>
              </>
            )}

            {/* Link parent to student */}
            <div className="pt-4 border-t space-y-3">
              <div className="font-medium text-sm text-gray-700">🔗 Link Parent to Student</div>
              <Field label="Parent *">
                <select className={input} value={linkParentForm.parent_user_id}
                  onChange={e => setLinkParentForm(f => ({ ...f, parent_user_id: e.target.value }))}>
                  <option value="">— Select Parent —</option>
                  {filteredUsers.filter(u => u.role === 'parent').map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </Field>
              <Field label="Student *">
                <select className={input} value={linkParentForm.student_id}
                  onChange={e => setLinkParentForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">— Select Student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.users?.full_name}</option>)}
                </select>
              </Field>
              <button onClick={linkParent} disabled={saving}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Linking…' : 'Link Parent to Student'}
              </button>
            </div>

            {/* All users table */}
            <div className="pt-4 border-t">
              <div className="font-medium text-sm text-gray-700 mb-3">
                All Users ({userSearchTerm ? `${filteredUsers.length} of ${users.length}` : users.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide text-left">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Telegram</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{u.full_name}</td>
                        <td className="px-3 py-2 text-gray-600">{u.email}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            u.role === 'admin'   ? 'bg-violet-100 text-violet-700' :
                            u.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                            u.role === 'parent'  ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {u.telegram_chat_id ? '✅ Linked' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
