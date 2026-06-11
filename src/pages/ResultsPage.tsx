import React, { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Term {
  id: string
  name: string
  academic_year: string
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
  student_name: string
  subject_name: string
  class_name: string
  term_name: string
  subjects: { code: string; name: string }
  students: { id: string; users: { full_name: string } }
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultsPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'results' | 'report'>('results')
  const [reportHtml, setReportHtml] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  // Load terms on mount
  useEffect(() => {
    api.get('/api/terms')
      .then(res => {
        const list: Term[] = res.data?.value ?? res.data ?? []
        setTerms(list)
        if (list.length > 0) setSelectedTerm(list[0].id)
      })
      .catch(() => setError('Failed to load terms'))
  }, [])

  // Load results when term changes
  useEffect(() => {
    if (!selectedTerm) return
    setLoading(true)
    setError(null)
    api.get('/api/results', { params: { term_id: selectedTerm } })
      .then(res => {
        setResults(res.data?.value ?? res.data ?? [])
        setSelectedStudent('all')
      })
      .catch(() => setError('Failed to load results'))
      .finally(() => setLoading(false))
  }, [selectedTerm])

  // Unique students in current results
  const students = Array.from(
    new Map(results.map(r => [r.student_id, r.student_name])).entries()
  ).map(([id, name]) => ({ id, name }))

  // Filtered results
  const filtered = selectedStudent === 'all'
    ? results
    : results.filter(r => r.student_id === selectedStudent)

  // Summary stats for filtered set
  const avg = filtered.length
    ? Math.round(filtered.reduce((s, r) => s + r.percentage, 0) / filtered.length)
    : 0
  const highest = filtered.length ? Math.max(...filtered.map(r => r.percentage)) : 0
  const lowest = filtered.length ? Math.min(...filtered.map(r => r.percentage)) : 0

  // Load HTML report card
  async function loadReport() {
    if (!selectedTerm || selectedStudent === 'all') return
    setReportLoading(true)
    setReportHtml(null)
    try {
      const res = await api.get(
        `/api/results/report/${selectedStudent}/term/${selectedTerm}`,
        { params: { format: 'html' }, responseType: 'text' }
      )
      setReportHtml(res.data)
    } catch {
      setReportHtml('<p style="color:red;padding:1rem">Failed to load report card.</p>')
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'report' && selectedStudent !== 'all') {
      loadReport()
    }
  }, [activeTab, selectedStudent, selectedTerm])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Results</h1>
        <p className="text-sm text-gray-500">View and analyse student academic results</p>
      </div>

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
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Summary cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Average', value: `${avg}%` },
            { label: 'Highest', value: `${highest}%` },
            { label: 'Lowest', value: `${lowest}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border rounded-xl px-4 py-3">
              <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
              <div className="text-2xl font-bold mt-1">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs — only show when a single student is selected */}
      {selectedStudent !== 'all' && (
        <div className="flex gap-1 border-b">
          {(['results', 'report'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab === 'report' ? 'Report Card' : 'Marks'}
            </button>
          ))}
        </div>
      )}

      {/* Results table */}
      {(selectedStudent === 'all' || activeTab === 'results') && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b text-sm text-gray-500">
            {loading ? 'Loading…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  {selectedStudent === 'all' && <th className="px-4 py-3">Student</th>}
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
                      {Array.from({ length: selectedStudent === 'all' ? 7 : 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-20" />
                        </td>
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
                      {selectedStudent === 'all' && (
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {r.student_name}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.subjects?.name ?? r.subject_name}</div>
                        <div className="text-xs text-gray-400">{r.subjects?.code}</div>
                      </td>
                      <td className="px-4 py-3 w-28">
                        <ScoreBar value={r.test_score} max={40} />
                      </td>
                      <td className="px-4 py-3 w-28">
                        <ScoreBar value={r.exam_score} max={60} />
                      </td>
                      <td className="px-4 py-3 w-28">
                        <ScoreBar value={r.total_score} max={100} />
                      </td>
                      <td className="px-4 py-3">
                        <GradeBadge grade={r.grade} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.remark}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report card iframe */}
      {selectedStudent !== 'all' && activeTab === 'report' && (
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