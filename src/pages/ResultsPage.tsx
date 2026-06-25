import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'
import { useAuth } from '../hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Term {
  id: string
  name: string
  academic_year: string
}

interface Child {
  student_id: string
  students: { users: { full_name: string } }
}

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
}

interface StudentOverall {
  totalScore: number
  percentage: string
  grade: string
  remark: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const pct = Math.min(100, (value / max) * 100)
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { user } = useAuth()
  const role = (user as any)?.role ?? 'student'
  const isStudent = role === 'student'
  const isParent  = role === 'parent'
  //const isAdminOrTeacher = role === 'admin' || role === 'teacher'

  const [terms, setTerms] = useState<Term[]>([])
  const [children, setChildren] = useState<Child[]>([])            // for parent
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('all')
  const [myStudentId, setMyStudentId] = useState('')              // student's own id
  const [activeTab, setActiveTab] = useState<'results' | 'report'>('results')
  const [reportHtml, setReportHtml] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  // For student: store the overall summary from my-results
  const [studentOverall, setStudentOverall] = useState<StudentOverall | null>(null)

  // ── Load terms and, for parents, children ──
  useEffect(() => {
    const promises: Promise<any>[] = [api.get('/api/terms')]
    if (isParent) {
      promises.push(api.get('/api/users/my-children'))
    }
    Promise.all(promises)
      .then(([termsRes, childrenRes]) => {
        const termList: Term[] = termsRes.data?.value ?? termsRes.data ?? []
        setTerms(termList)
        if (termList.length > 0) setSelectedTerm(termList[0].id)

        if (isParent && childrenRes) {
          const childList: Child[] = childrenRes.data?.value ?? childrenRes.data ?? []
          setChildren(childList)
          if (childList.length > 0) {
            setSelectedStudent(childList[0].student_id)
          }
        }
      })
      .catch(() => setError('Failed to load data'))
  }, [])

  // ── Load results when term or student selection changes ──
  useEffect(() => {
    if (!selectedTerm) return
    setLoading(true)
    setError(null)

    // Reset overall for non‑students
    if (!isStudent) setStudentOverall(null)

    if (isStudent) {
      // ───── Student: use dedicated endpoint ─────
      api.get('/api/results/my-results', { params: { term_id: selectedTerm } })
        .then(res => {
          const data = res.data
          const subjectsArray: Result[] = Array.isArray(data)
            ? data
            : data?.subjects ?? data?.value ?? []
          setResults(subjectsArray)

          const sid = data?.student_id ?? subjectsArray[0]?.student_id ?? ''
          setMyStudentId(sid)
          if (sid) setSelectedStudent(sid)

          if (data?.overall) setStudentOverall(data.overall)
          else setStudentOverall(null)
        })
        .catch(() => setError('Failed to load your results'))
        .finally(() => setLoading(false))
    } else if (isParent && selectedStudent && selectedStudent !== 'all') {
      // ───── Parent: fetch results for selected child ─────
      api.get(`/api/results/student/${selectedStudent}/term/${selectedTerm}`)
        .then(res => {
          const data = res.data
          const arr: Result[] = Array.isArray(data) ? data : data?.value ?? []
          setResults(arr)
        })
        .catch(() => setError('Failed to load results'))
        .finally(() => setLoading(false))
    } else {
      // ───── Admin/Teacher: list all results ─────
      api.get('/api/results', { params: { term_id: selectedTerm } })
        .then(res => {
          const all: Result[] = res.data?.value ?? res.data ?? []
          setResults(all)
          if (!isParent) setSelectedStudent('all')
        })
        .catch(() => setError('Failed to load results'))
        .finally(() => setLoading(false))
    }
  }, [selectedTerm, selectedStudent, isStudent, isParent])

  // Unique students from results (admin/teacher view)
  const students = Array.from(
    new Map(results.map(r => [r.student_id, r.student_name ?? ''])).entries()
  ).map(([id, name]) => ({ id, name }))

  // Filtered results
  const filtered = (isStudent || isParent)
    ? results
    : selectedStudent === 'all'
      ? results
      : results.filter(r => r.student_id === selectedStudent)

  // Summary stats (compute for any role)
  const avg = filtered.length
    ? Math.round(filtered.reduce((s, r) => s + r.percentage, 0) / filtered.length)
    : 0
  const highest = filtered.length ? Math.max(...filtered.map(r => r.percentage)) : 0
  const lowest = filtered.length ? Math.min(...filtered.map(r => r.percentage)) : 0

  // Compute overall for parent (since the endpoint returns raw results, not aggregated)
  const computedOverall: StudentOverall | null = (isParent && filtered.length > 0)
    ? {
        totalScore: filtered.reduce((sum, r) => sum + r.total_score, 0),
        percentage: avg.toFixed(1),
        grade: getGradeFromPercentage(avg),
        remark: getRemarkFromPercentage(avg),
      }
    : null

  // Helper functions for parent overall
  function getGradeFromPercentage(pct: number) {
    if (pct >= 80) return 'A+'
    if (pct >= 70) return 'A'
    if (pct >= 60) return 'B'
    if (pct >= 50) return 'C'
    if (pct >= 40) return 'D'
    if (pct >= 30) return 'E'
    return 'F'
  }
  function getRemarkFromPercentage(pct: number) {
    if (pct >= 80) return 'Excellent'
    if (pct >= 70) return 'Very Good'
    if (pct >= 60) return 'Good'
    if (pct >= 50) return 'Average'
    if (pct >= 40) return 'Fair'
    return 'Below Ave'
  }

  // The student_id to use for report card
  const reportStudentId = isStudent ? myStudentId : selectedStudent

  // Load HTML report card
  async function loadReport() {
    if (!selectedTerm || !reportStudentId || reportStudentId === 'all') return
    setReportLoading(true)
    setReportHtml(null)
    try {
      const res = await api.get(`/api/results/report/${reportStudentId}/term/${selectedTerm}`, {
        params: { format: 'html' },
        responseType: 'text',
      })
      setReportHtml(res.data)
    } catch {
      setReportHtml('<p style="color:red;padding:1rem">Failed to load report card.</p>')
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'report') loadReport()
  }, [activeTab, reportStudentId, selectedTerm])

  const showReportTab = isStudent ? !!myStudentId : (isParent ? selectedStudent !== 'all' : selectedStudent !== 'all')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Results</h1>
        <p className="text-sm text-gray-500">
          {isStudent ? 'Your academic results' : isParent ? 'Your child\'s academic progress' : 'View and analyse student academic results'}
        </p>
      </div>

      {/* Student overall card (student) */}
      {isStudent && studentOverall && (
        <div className="bg-white border rounded-xl px-4 py-3 grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-gray-500">Total Score</span>
            <div className="text-2xl font-bold">{studentOverall.totalScore}</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Percentage</span>
            <div className="text-2xl font-bold">{studentOverall.percentage}%</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Grade</span>
            <div className="text-xl font-bold"><GradeBadge grade={studentOverall.grade} /></div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Remark</span>
            <div className="text-lg font-medium text-gray-700">{studentOverall.remark}</div>
          </div>
        </div>
      )}

      {/* Parent overall card (computed) */}
      {isParent && computedOverall && (
        <div className="bg-white border rounded-xl px-4 py-3 grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-gray-500">Total Score</span>
            <div className="text-2xl font-bold">{computedOverall.totalScore}</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Percentage</span>
            <div className="text-2xl font-bold">{computedOverall.percentage}%</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Grade</span>
            <div className="text-xl font-bold"><GradeBadge grade={computedOverall.grade} /></div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Remark</span>
            <div className="text-lg font-medium text-gray-700">{computedOverall.remark}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="border rounded-lg px-3 py-2 text-sm bg-white"
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
        >
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>
          ))}
        </select>

        {/* Child selector for parent */}
        {isParent && children.length > 0 && (
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

        {/* Student selector for admin/teacher */}
        {!isStudent && !isParent && (
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="all">All Students</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Summary cards */}
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
          {(['results', 'report'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab === 'report' ? 'Report Card' : 'Marks'}
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
                  {!isStudent && !isParent && selectedStudent === 'all' && (
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
                      No results found for this selection
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      {!isStudent && !isParent && selectedStudent === 'all' && (
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {r.student_name ?? r.subjects?.code}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.subjects?.name ?? r.subject_name}</div>
                        <div className="text-xs text-gray-400">{r.subjects?.code}</div>
                      </td>
                      <td className="px-4 py-3 w-28"><ScoreBar value={r.test_score} max={40} /></td>
                      <td className="px-4 py-3 w-28"><ScoreBar value={r.exam_score} max={60} /></td>
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
            <iframe
              srcDoc={reportHtml}
              className="w-full"
              style={{ height: '80vh', border: 'none' }}
              title="Report Card"
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
