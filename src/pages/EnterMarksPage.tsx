import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'

interface Class { id: string; name: string; section: string }
interface Term { id: string; name: string; academic_year: string }
interface Subject { id: string; name: string; code: string }
interface Enrollment {
  student_id: string
  students: { users: { full_name: string } }
}

interface MarkEntry {
  student_id: string
  student_name: string
  test_score: string
  exam_score: string
}

export default function EnterMarksPage() {
  const [classes,  setClasses]  = useState<Class[]>([])
  const [terms,    setTerms]    = useState<Term[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [selectedClass,   setSelectedClass]   = useState('')
  const [selectedTerm,    setSelectedTerm]    = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  const [marks, setMarks] = useState<MarkEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/classes'),
      api.get('/api/terms'),
      api.get('/api/subjects'),
    ]).then(([cl, te, su]) => {
      const classList    = cl.data?.value ?? cl.data ?? []
      const termList     = te.data?.value ?? te.data ?? []
      const subjectList  = su.data?.value ?? su.data ?? []
      setClasses(classList)
      setTerms(termList)
      setSubjects(subjectList)
      if (classList[0])   setSelectedClass(classList[0].id)
      if (termList[0])    setSelectedTerm(termList[0].id)
      if (subjectList[0]) setSelectedSubject(subjectList[0].id)
    }).catch(() => toast.error('Failed to load data'))
  }, [])

  // Load students when class changes
  useEffect(() => {
    if (!selectedClass) return
    setLoading(true)
    api.get('/api/enrollments', { params: { class_id: selectedClass } })
      .then(res => {
        const list: Enrollment[] = res.data?.value ?? res.data ?? []
        setMarks(list.map(e => ({
          student_id: e.student_id,
          student_name: e.students?.users?.full_name ?? '—',
          test_score: '',
          exam_score: '',
        })))
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }, [selectedClass])

  function updateMark(studentId: string, field: 'test_score' | 'exam_score', value: string) {
    setMarks(prev => prev.map(m =>
      m.student_id === studentId ? { ...m, [field]: value } : m
    ))
  }

  function total(m: MarkEntry) {
    const t = Number(m.test_score) || 0
    const e = Number(m.exam_score) || 0
    return t + e
  }

  async function saveMarks() {
    const filled = marks.filter(m => m.test_score !== '' || m.exam_score !== '')
    if (filled.length === 0) return toast.error('Enter at least one mark')
    if (!selectedClass || !selectedTerm || !selectedSubject)
      return toast.error('Select class, term and subject')

    // Validate ranges
    for (const m of filled) {
      const t = Number(m.test_score)
      const e = Number(m.exam_score)
      if (t < 0 || t > 40) return toast.error(`${m.student_name}: test score must be 0–40`)
      if (e < 0 || e > 60) return toast.error(`${m.student_name}: exam score must be 0–60`)
    }

    setSaving(true)
    try {
      await api.post('/api/results/bulk', {
        marks: filled.map(m => ({
          student_id:  m.student_id,
          subject_id:  selectedSubject,
          term_id:     selectedTerm,
          class_id:    selectedClass,
          test_score:  Number(m.test_score) || 0,
          exam_score:  Number(m.exam_score) || 0,
        }))
      })
      toast.success(`Marks saved for ${filled.length} students`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  function fillAll(field: 'test_score' | 'exam_score', value: string) {
    setMarks(prev => prev.map(m => ({ ...m, [field]: value })))
  }

  const selectedSubjectName = subjects.find(s => s.id === selectedSubject)?.name ?? ''

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Enter Marks</h1>
        <p className="text-sm text-gray-500">Record test and exam scores per subject</p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Class</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Term</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Subject</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Marks table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">
            {selectedSubjectName} — {marks.length} students
          </div>
          {/* Quick fill */}
          <div className="flex gap-2 text-xs">
            <button onClick={() => fillAll('test_score', '40')}
              className="text-violet-600 hover:underline">Fill test max</button>
            <button onClick={() => setMarks(m => m.map(e => ({ ...e, test_score: '', exam_score: '' })))}
              className="text-gray-400 hover:underline">Clear all</button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : marks.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            No students enrolled in this class
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 w-28">Test /40</th>
                  <th className="px-4 py-3 w-28">Exam /60</th>
                  <th className="px-4 py-3 w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {marks.map((m, idx) => {
                  const t = total(m)
                  const hasValues = m.test_score !== '' || m.exam_score !== ''
                  return (
                    <tr key={m.student_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <span className="font-medium text-gray-900">{m.student_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min={0} max={40}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                          placeholder="0–40"
                          value={m.test_score}
                          onChange={e => updateMark(m.student_id, 'test_score', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min={0} max={60}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                          placeholder="0–60"
                          value={m.exam_score}
                          onChange={e => updateMark(m.student_id, 'exam_score', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {hasValues ? (
                          <span className={`font-bold text-sm ${
                            t >= 70 ? 'text-green-600' :
                            t >= 50 ? 'text-blue-600' :
                            t >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {t}/100
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {marks.length > 0 && (
        <button
          onClick={saveMarks}
          disabled={saving}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Marks'}
        </button>
      )}
    </div>
  )
}