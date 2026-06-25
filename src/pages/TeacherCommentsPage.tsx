import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'

interface Student { id: string; users: { full_name: string } }
interface Term { id: string; name: string; academic_year: string }
interface Class { id: string; name: string; section: string }

export default function TeacherCommentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [terms,    setTerms]    = useState<Term[]>([])
  const [classes,  setClasses]  = useState<Class[]>([])

  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedTerm,    setSelectedTerm]    = useState('')
  const [selectedClass,   setSelectedClass]   = useState('')

  const [teacherComment,    setTeacherComment]    = useState('')
  const [principalComment,  setPrincipalComment]  = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/students'),
      api.get('/api/terms'),
      api.get('/api/classes'),
    ]).then(([st, te, cl]) => {
      const sList = st.data?.value ?? st.data ?? []
      const tList = te.data?.value ?? te.data ?? []
      const cList = cl.data?.value ?? cl.data ?? []
      setStudents(sList)
      setTerms(tList)
      setClasses(cList)
      if (sList[0]) setSelectedStudent(sList[0].id)
      if (tList[0]) setSelectedTerm(tList[0].id)
      if (cList[0]) setSelectedClass(cList[0].id)
    }).catch(() => toast.error('Failed to load data'))
  }, [])

  async function saveComment() {
    if (!selectedStudent || !selectedTerm) return toast.error('Select student and term')
    if (!teacherComment.trim() && !principalComment.trim())
      return toast.error('Enter at least one comment')
    setSaving(true)
    setSaved(false)
    try {
      await api.put(
        `/api/results/comment/${selectedStudent}/term/${selectedTerm}`,
        {
          teacher_comment:   teacherComment.trim() || undefined,
          principal_comment: principalComment.trim() || undefined,
          class_id:          selectedClass || undefined,
        }
      )
      toast.success('Comment saved')
      setSaved(true)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save comment')
    } finally {
      setSaving(false)
    }
  }

  const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
  const ta  = `${inp} resize-none`
  const selectedStudentName = students.find(s => s.id === selectedStudent)?.users?.full_name ?? ''

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Teacher Comments</h1>
        <p className="text-sm text-gray-500">Add teacher and principal comments to student report cards</p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Student</label>
          <select className={inp} value={selectedStudent} onChange={e => { setSelectedStudent(e.target.value); setSaved(false) }}>
            <option value="">— Select —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.users?.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Term</label>
          <select className={inp} value={selectedTerm} onChange={e => { setSelectedTerm(e.target.value); setSaved(false) }}>
            <option value="">— Select —</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Class</label>
          <select className={inp} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">— Select —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
        </div>
      </div>

      {/* Comment form */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        {selectedStudentName && (
          <div className="flex items-center gap-3 pb-3 border-b">
            <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
              {selectedStudentName[0]}
            </div>
            <div className="font-medium text-gray-900">{selectedStudentName}</div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teacher's Comment
          </label>
          <textarea
            className={ta}
            rows={4}
            placeholder="e.g. John has shown great improvement this term. He is hardworking and participates actively in class..."
            value={teacherComment}
            onChange={e => { setTeacherComment(e.target.value); setSaved(false) }}
          />
          <div className="text-xs text-gray-400 mt-1 text-right">{teacherComment.length} chars</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Principal's Comment
          </label>
          <textarea
            className={ta}
            rows={3}
            placeholder="e.g. Excellent performance. Keep it up!"
            value={principalComment}
            onChange={e => { setPrincipalComment(e.target.value); setSaved(false) }}
          />
          <div className="text-xs text-gray-400 mt-1 text-right">{principalComment.length} chars</div>
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">
            ✓ Comment saved — it will appear on the report card
          </div>
        )}

        <button
          onClick={saveComment}
          disabled={saving}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Comment'}
        </button>
      </div>
    </div>
  )
}
