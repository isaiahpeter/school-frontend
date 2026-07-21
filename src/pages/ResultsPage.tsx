import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'
import { useAuth } from '../hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Term    { id: string; name: string; academic_year: string }
interface Child   { student_id: string; students: { users: { full_name: string } } }
interface Subject { id: string; name: string; code: string }
interface Class   { id: string; name: string; section: string }

interface Result {
  id: string
  student_id: string
  subject_id: string
  term_id: string
  class_id: string
  test_score: number
  exam_score: number
  total_score: number
  percentage: number
  grade: string
  remark: string
  student_name?: string
  subject_name?: string
  subjects?: { code: string; name: string }
  students?: { id: string; users: { full_name: string } }
}

interface StudentOverall {
  totalScore: number
  percentage: string
  grade: string
  remark: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeFromPct(pct: number) {
  if (pct >= 80) return 'A+'
  if (pct >= 70) return 'A'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  if (pct >= 30) return 'E'
  return 'F'
}

function remarkFromPct(pct: number) {
  if (pct >= 80) return 'Excellent'
  if (pct >= 70) return 'Very Good'
  if (pct >= 60) return 'Good'
  if (pct >= 50) return 'Average'
  if (pct >= 40) return 'Fair'
  return 'Below Ave'
}

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-700',
  'A':  'bg-green-100 text-green-700',
  'B':  'bg-blue-100 text-blue-700',
  'C':  'bg-yellow-100 text-yellow-700',
  'D':  'bg-orange-100 text-orange-700',
  'E':  'bg-red-100 text-red-700',
  'F':  'bg-red-200 text-red-800',
}

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${GRADE_COLORS[grade] ?? 'bg-gray-100 text-gray-600'}`}>
      {grade}
    </span>
  )
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct   = Math.min(100, (value / max) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value}</span>
    </div>
  )
}

const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"

// ─── Main component ──────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { user } = useAuth()
  // Force role to lowercase for consistent checks
  const role             = ((user as any)?.role ?? 'student').toLowerCase()
  const isStudent        = role === 'student'
  const isParent         = role === 'parent'
  const isAdminOrTeacher = role === 'admin' || role === 'teacher'

  const [searchParams]    = useSearchParams()
  const urlStudentId      = searchParams.get('student_id')   // from direct link

  const [terms,        setTerms]        = useState<Term[]>([])
  const [children,     setChildren]     = useState<Child[]>([])
  const [results,      setResults]      = useState<Result[]>([])
  const [subjects,     setSubjects]     = useState<Subject[]>([])
  const [classes,      setClasses]      = useState<Class[]>([])
  const [allStudents,  setAllStudents]  = useState<{ id: string; name: string }[]>([])
  const [resultStudents, setResultStudents] = useState<{ id: string; name: string }[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('all')
  const [myStudentId, setMyStudentId]   = useState('')
  const [activeTab,   setActiveTab]     = useState<'results' | 'report'>('results')
  const [reportHtml,  setReportHtml]    = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [studentOverall, setStudentOverall] = useState<StudentOverall | null>(null)

  const [showMarksModal, setShowMarksModal] = useState(false)
  const [savingMarks,    setSavingMarks]    = useState(false)
  const [marksForm, setMarksForm] = useState({
    student_id: '', subject_id: '', term_id: '', class_id: '',
    test_score: '', exam_score: '',
  })

  // Attendance summary modal
  const [showAttModal,   setShowAttModal]   = useState(false)
  const [savingAtt,      setSavingAtt]      = useState(false)
  const [attForm, setAttForm] = useState({
    student_id: '', term_id: '', class_id: '',
    present_count: '', total_school_days: '',
  })

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const promises: Promise<any>[] = [api.get('/api/terms')]
        if (isParent)         promises.push(api.get('/api/users/my-children'))
        if (isAdminOrTeacher) {
          promises.push(api.get('/api/subjects'))
          promises.push(api.get('/api/classes'))
          promises.push(api.get('/api/students'))
        }

        const results = await Promise.all(promises)
        const termsRes = results[0]
        let childrenRes: any, subjectsRes: any, classesRes: any, studentsRes: any
        if (isParent)         childrenRes  = results[1]
        if (isAdminOrTeacher) {
          subjectsRes = results[isParent ? 2 : 1]
          classesRes  = results[isParent ? 3 : 2]
          studentsRes = results[isParent ? 4 : 3]
        }

        const termList: Term[] = Array.isArray(termsRes.data)
          ? termsRes.data : (termsRes.data?.value ?? [])
        setTerms(termList)
        if (termList.length > 0) {
          setSelectedTerm(termList[0].id)
          setMarksForm(f => ({ ...f, term_id: termList[0].id }))
        }

        if (isParent && childrenRes) {
          const childList: Child[] = Array.isArray(childrenRes.data) ? childrenRes.data : (childrenRes.data?.value ?? [])
          setChildren(childList)
          const defaultId = urlStudentId ?? childList[0]?.student_id ?? ''
          if (defaultId) setSelectedStudent(defaultId)
        }

        if (isAdminOrTeacher) {
          if (subjectsRes) setSubjects(subjectsRes.data?.value ?? subjectsRes.data ?? [])
          if (classesRes)  setClasses(classesRes.data?.value ?? classesRes.data ?? [])
          if (studentsRes) {
            const studentList = studentsRes.data?.value ?? studentsRes.data ?? []
            setAllStudents(
              studentList.map((s: any) => ({
                id:   s.id,
                name: s.users?.full_name ?? s.id,
              }))
            )
          }
        }
      } catch (err) {
        setError('Failed to load data')
      }
    }
    load()
  }, [isParent, isAdminOrTeacher, urlStudentId])

  // ── Load results when selection changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedTerm) return
    setLoading(true)
    setError(null)
    if (!isStudent) setStudentOverall(null)

    if (isStudent) {
      api.get('/api/results/my-results', { params: { term_id: selectedTerm } })
        .then(res => {
          const data = res.data
          const arr: Result[] = Array.isArray(data) ? data : (data?.subjects ?? data?.value ?? [])
          setResults(arr)
          const sid = data?.student_id ?? arr[0]?.student_id ?? ''
          setMyStudentId(sid)
          if (sid) setSelectedStudent(sid)
          if (data?.overall) setStudentOverall(data.overall)
        })
        .catch(() => setError('Failed to load your results'))
        .finally(() => setLoading(false))
    } else if (isAdminOrTeacher) {
      api.get('/api/results', { params: { term_id: selectedTerm } })
        .then(res => {
          const all: Result[] = res.data?.value ?? res.data ?? []
          setResults(all)
          const map = new Map<string, string>()
          all.forEach(r => {
            const name = r.student_name ?? r.students?.users?.full_name
            if (r.student_id && name) map.set(r.student_id, name)
          })
          setResultStudents(Array.from(map.entries()).map(([id, name]) => ({ id, name })))
        })
        .catch(() => setError('Failed to load results'))
        .finally(() => setLoading(false))
    } else {
      // parent — handled by separate effect below
      setLoading(false)
    }
  }, [selectedTerm, isStudent, isParent, isAdminOrTeacher])

  // ── Reload when parent switches child ──────────────────────────────────────
  useEffect(() => {
    if (!isParent) return
    if (!selectedStudent || selectedStudent === 'all' || !selectedTerm) return
    setLoading(true)
    api.get(`/api/results/student/${selectedStudent}/term/${selectedTerm}`)
      .then(res => {
        setResults(Array.isArray(res.data) ? res.data : (res.data?.value ?? []))
      })
      .catch(() => setError('Failed to load results'))
      .finally(() => setLoading(false))
  }, [selectedStudent, isParent, selectedTerm])

  // ── Derived values ─────────────────────────────────────────────────────────
  const filtered = (isStudent || isParent)
    ? results
    : selectedStudent === 'all'
      ? results
      : results.filter(r => r.student_id === selectedStudent)

  const avg     = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.percentage, 0) / filtered.length) : 0
  const highest = filtered.length ? Math.max(...filtered.map(r => r.percentage)) : 0
  const lowest  = filtered.length ? Math.min(...filtered.map(r => r.percentage)) : 0

  const computedOverall: StudentOverall | null = (isParent && filtered.length > 0) ? {
    totalScore: filtered.reduce((s, r) => s + r.total_score, 0),
    percentage: avg.toFixed(1),
    grade:  gradeFromPct(avg),
    remark: remarkFromPct(avg),
  } : null

  const reportStudentId = isStudent ? myStudentId : selectedStudent
  const showReportTab   = isStudent ? !!myStudentId : selectedStudent !== 'all'

  // ── Report card ────────────────────────────────────────────────────────────
  async function loadReport() {
    if (!selectedTerm || !reportStudentId || reportStudentId === 'all') return
    setReportLoading(true)
    setReportHtml(null)
    try {
      const res = await api.get(
        `/api/results/report/${reportStudentId}/term/${selectedTerm}`,
        { params: { format: 'html' }, responseType: 'text' }
      )
      setReportHtml(res.data)
    } catch {
      setReportHtml('<p style="color:red;padding:1rem">Failed to load report card.</p>')
    } finally { setReportLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'report') loadReport()
  }, [activeTab, reportStudentId, selectedTerm])

  // ── PDF download for a specific term ───────────────────────────────────────
  async function downloadPDF(studentId: string, termId: string, filename = 'report-card.pdf') {
    try {
      const res = await api.get(
        `/api/results/report/${studentId}/term/${termId}`,
        { params: { format: 'pdf' }, responseType: 'blob' }
      )
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download PDF')
    }
  }

  async function downloadLatestPDF(studentId: string) {
    try {
      const res = await api.get(
        `/api/results/report/${studentId}/latest`,
        { responseType: 'blob' }
      )
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'report-card-latest.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download PDF')
    }
  }

    // ── Save marks ─────────────────────────────────────────────────────────────
  async function saveMarks() {
    const { student_id, subject_id, term_id, class_id, test_score, exam_score } = marksForm
    if (!student_id || !subject_id || !term_id || !class_id)
      return toast.error('Fill all required fields')
    const t = Number(test_score)
    const e = Number(exam_score)
    if (isNaN(t) || t < 0 || t > 40) return toast.error('Test score must be 0–40')
    if (isNaN(e) || e < 0 || e > 60) return toast.error('Exam score must be 0–60')
    setSavingMarks(true)
    try {
      await api.post('/api/results', {
        student_id, subject_id, term_id, class_id,
        test_score: t, exam_score: e,
      })
      toast.success('Marks saved')
      setShowMarksModal(false)
      setMarksForm(f => ({ ...f, student_id: '', subject_id: '', test_score: '', exam_score: '' }))
      // Refresh results
      if (selectedTerm) {
        api.get('/api/results', { params: { term_id: selectedTerm } }).then(res => {
          const all: Result[] = res.data?.value ?? res.data ?? []
          setResults(all)
          const map = new Map<string, string>()
          all.forEach(r => {
            const name = r.student_name ?? r.students?.users?.full_name
            if (r.student_id && name) map.set(r.student_id, name)
          })
          setResultStudents(Array.from(map.entries()).map(([id, name]) => ({ id, name })))
        }).catch(() => {})
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save marks')
    } finally { setSavingMarks(false) }
  }

  // ── Save attendance summary ───────────────────────────────────────────────
  async function saveAttendanceSummary() {
    const { student_id, term_id, class_id, present_count, total_school_days } = attForm
    if (!student_id || !term_id || !class_id || !present_count || !total_school_days)
      return toast.error('All fields are required')
    const p = Number(present_count)
    const t = Number(total_school_days)
    if (isNaN(p) || p < 0) return toast.error('Present count must be 0 or more')
    if (isNaN(t) || t <= 0) return toast.error('Total school days must be greater than 0')
    if (p > t) return toast.error('Present count cannot exceed total school days')
    setSavingAtt(true)
    try {
      await api.post('/api/attendance/summary', {
        student_id, term_id, class_id,
        present_count: p,
        total_school_days: t,
      })
      toast.success('Attendance summary saved — report card will reflect this')
      setShowAttModal(false)
      setAttForm({ student_id: '', term_id: '', class_id: '', present_count: '', total_school_days: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save attendance')
    } finally { setSavingAtt(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-sm text-gray-500">
            {isStudent ? 'Your academic results'
              : isParent ? "Your child's academic progress"
              : 'View and analyse student academic results'}
          </p>
        </div>
        {isAdminOrTeacher && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowMarksModal(true)}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ✏️ Enter Marks
            </button>
            <button
              onClick={() => setShowAttModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              📊 Term Attendance
            </button>
          </div>
        )}
      </div>

      {/* Student overall card */}
      {isStudent && studentOverall && (
        <div className="bg-white border rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Score', value: String(studentOverall.totalScore) },
            { label: 'Percentage',  value: `${studentOverall.percentage}%` },
            { label: 'Grade',       value: studentOverall.grade },
            { label: 'Remark',      value: studentOverall.remark },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              {label === 'Grade'
                ? <GradeBadge grade={value} />
                : <div className="text-xl font-bold text-gray-900">{value}</div>
              }
            </div>
          ))}
        </div>
      )}

      {/* Parent overall card */}
      {isParent && computedOverall && (
        <div className="bg-white border rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Score', value: String(computedOverall.totalScore) },
            { label: 'Percentage',  value: `${computedOverall.percentage}%` },
            { label: 'Grade',       value: computedOverall.grade },
            { label: 'Remark',      value: computedOverall.remark },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              {label === 'Grade'
                ? <GradeBadge grade={value} />
                : <div className="text-xl font-bold text-gray-900">{value}</div>
              }
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="border rounded-lg px-3 py-2 text-sm bg-white"
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
        >
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>
          ))}
        </select>

        {/* Parent child selector (hidden if direct link) */}
        {isParent && children.length > 0 && !urlStudentId && (
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            {children.map(c => (
              <option key={c.student_id} value={c.student_id}>
                {c.students?.users?.full_name}
              </option>
            ))}
          </select>
        )}

        {/* Admin/teacher student filter */}
        {isAdminOrTeacher && (
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="all">All Students</option>
            {resultStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Download PDF for selected term */}
        {selectedStudent && selectedStudent !== 'all' && selectedTerm && (
          <button
            onClick={() => downloadPDF(selectedStudent, selectedTerm)}
            className="px-3 py-2 border border-violet-300 text-violet-600 hover:bg-violet-50 text-sm font-medium rounded-lg transition-colors"
          >
            📄 Download PDF
          </button>
        )}

        {/* Download latest term PDF */}
        {selectedStudent && selectedStudent !== 'all' && (
          <button
            onClick={() => downloadLatestPDF(selectedStudent)}
            className="px-3 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
          >
            📥 Latest Term PDF
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Summary stats */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Average', value: `${avg}%` },
            { label: 'Highest', value: `${highest}%` },
            { label: 'Lowest',  value: `${lowest}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border rounded-xl px-4 py-3">
              <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
              <div className="text-2xl font-bold mt-1">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {showReportTab && (
        <div className="flex gap-1 border-b">
          {(['results', 'report'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === t ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}>
              {t === 'report' ? 'Report Card' : 'Marks'}
            </button>
          ))}
        </div>
      )}

      {/* Results table */}
      {activeTab === 'results' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b text-sm text-gray-500">
            {loading ? 'Loading…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  {isAdminOrTeacher && selectedStudent === 'all' && (
                    <th className="px-4 py-3">Student</th>
                  )}
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Test /40</th>
                  <th className="px-4 py-3">Exam /60</th>
                  <th className="px-4 py-3">Total /100</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      No results found for this term
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      {isAdminOrTeacher && selectedStudent === 'all' && (
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {r.student_name ?? r.students?.users?.full_name}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.subjects?.name ?? r.subject_name}</div>
                        <div className="text-xs text-gray-400">{r.subjects?.code}</div>
                      </td>
                      <td className="px-4 py-3 w-28"><ScoreBar value={r.test_score}  max={40}  /></td>
                      <td className="px-4 py-3 w-28"><ScoreBar value={r.exam_score}  max={60}  /></td>
                      <td className="px-4 py-3 w-28"><ScoreBar value={r.total_score} max={100} /></td>
                      <td className="px-4 py-3"><GradeBadge grade={r.grade} /></td>
                      <td className="px-4 py-3 text-gray-600">{r.remark}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report card */}
      {activeTab === 'report' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          {reportLoading ? (
            <div className="p-10 text-center text-sm text-gray-400 animate-pulse">
              Generating report card…
            </div>
          ) : reportHtml ? (
            <>
              {(isParent || isAdminOrTeacher) && reportStudentId && selectedTerm && (
                <div className="px-4 py-3 border-b flex justify-end">
                  <button
                    onClick={() => downloadPDF(reportStudentId, selectedTerm)}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    📥 Download PDF
                  </button>
                </div>
              )}
              <iframe
                srcDoc={reportHtml}
                className="w-full"
                style={{ height: '80vh', border: 'none' }}
                title="Report Card"
              />
            </>
          ) : null}
        </div>
      )}

      {/* ── Term Attendance Summary Modal ── */}
      {showAttModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Term Attendance Summary</h3>
              <button onClick={() => setShowAttModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <p className="text-xs text-gray-500">
              Enter the student's attendance for the full term. This will appear on their report card.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                <select className={inputClass} value={attForm.student_id}
                  onChange={e => setAttForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">— Select Student —</option>
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                <select className={inputClass} value={attForm.term_id}
                  onChange={e => setAttForm(f => ({ ...f, term_id: e.target.value }))}>
                  <option value="">— Select Term —</option>
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <select className={inputClass} value={attForm.class_id}
                  onChange={e => setAttForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">— Select Class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days Present *</label>
                  <input
                    type="number" min={0} placeholder="e.g. 58"
                    className={`${inputClass} ${
                      attForm.present_count && attForm.total_school_days &&
                      Number(attForm.present_count) > Number(attForm.total_school_days)
                        ? 'border-red-400 bg-red-50' : ''
                    }`}
                    value={attForm.present_count}
                    onChange={e => setAttForm(f => ({ ...f, present_count: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total School Days *</label>
                  <input
                    type="number" min={1} placeholder="e.g. 65"
                    className={inputClass}
                    value={attForm.total_school_days}
                    onChange={e => setAttForm(f => ({ ...f, total_school_days: e.target.value }))}
                  />
                </div>
              </div>
              {/* Live preview */}
              {attForm.present_count && attForm.total_school_days &&
               Number(attForm.total_school_days) > 0 &&
               Number(attForm.present_count) <= Number(attForm.total_school_days) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                  <div className="flex justify-between text-emerald-800">
                    <span>Present: <strong>{attForm.present_count}</strong></span>
                    <span>Absent: <strong>{Number(attForm.total_school_days) - Number(attForm.present_count)}</strong></span>
                    <span>Total: <strong>{attForm.total_school_days}</strong></span>
                  </div>
                  <div className="mt-1 text-xs text-emerald-600 text-center">
                    {Math.round((Number(attForm.present_count) / Number(attForm.total_school_days)) * 100)}% attendance
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={saveAttendanceSummary} disabled={savingAtt}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-60 transition-colors"
            >
              {savingAtt ? 'Saving…' : 'Save Attendance Summary'}
            </button>
          </div>
        </div>
      )}

      {/* Enter Marks Modal */}
      {showMarksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Enter Marks</h3>
              <button onClick={() => setShowMarksModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                <select className={inputClass} value={marksForm.student_id}
                  onChange={e => setMarksForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">— Select Student —</option>
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select className={inputClass} value={marksForm.subject_id}
                  onChange={e => setMarksForm(f => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">— Select Subject —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                <select className={inputClass} value={marksForm.term_id}
                  onChange={e => setMarksForm(f => ({ ...f, term_id: e.target.value }))}>
                  <option value="">— Select Term —</option>
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <select className={inputClass} value={marksForm.class_id}
                  onChange={e => setMarksForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">— Select Class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test (0–40) *</label>
                  <input
                    type="number" min={0} max={40} placeholder="0–40"
                    className={`${inputClass} ${
                      marksForm.test_score !== '' &&
                      (Number(marksForm.test_score) < 0 || Number(marksForm.test_score) > 40)
                        ? 'border-red-400 bg-red-50' : ''
                    }`}
                    value={marksForm.test_score}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || (Number(v) >= 0 && Number(v) <= 40))
                        setMarksForm(f => ({ ...f, test_score: v }))
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam (0–60) *</label>
                  <input
                    type="number" min={0} max={60} placeholder="0–60"
                    className={`${inputClass} ${
                      marksForm.exam_score !== '' &&
                      (Number(marksForm.exam_score) < 0 || Number(marksForm.exam_score) > 60)
                        ? 'border-red-400 bg-red-50' : ''
                    }`}
                    value={marksForm.exam_score}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || (Number(v) >= 0 && Number(v) <= 60))
                        setMarksForm(f => ({ ...f, exam_score: v }))
                    }}
                  />
                </div>
              </div>
              {marksForm.test_score && marksForm.exam_score && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-sm flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-violet-700">
                    {Number(marksForm.test_score) + Number(marksForm.exam_score)} / 100
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={saveMarks} disabled={savingMarks}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg disabled:opacity-60 transition-colors"
            >
              {savingMarks ? 'Saving…' : 'Save Marks'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
