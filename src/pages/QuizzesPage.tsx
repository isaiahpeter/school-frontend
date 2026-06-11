import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Quiz {
  id: string
  title: string
  description?: string
  time_limit_minutes?: number
  is_published: boolean
  require_payment: boolean
  subjects?: { name: string } | null
  classes?: { name: string } | null
  terms?: { name: string } | null
}

interface Option {
  id: string
  option_text: string
  is_correct: boolean
  order_index: number
}

interface Question {
  id: string
  question_text: string
  points: number
  order_index: number
  quiz_question_options: Option[]
}

interface QuizDetail extends Quiz {
  quiz_questions: Question[]
}

// ─── Create Quiz Form ─────────────────────────────────────────────────────────

interface QuestionDraft {
  question_text: string
  points: number
  options: { option_text: string; is_correct: boolean }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [activeQuiz, setActiveQuiz] = useState<QuizDetail | null>(null)
  const [takingQuiz, setTakingQuiz] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<{ earned: number; total: number } | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Create quiz state
  const [showCreate, setShowCreate] = useState(false)
  const [classes, setClasses]   = useState<{ id: string; name: string }[]>([])
  const [terms,   setTerms]     = useState<{ id: string; name: string; academic_year: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [createForm, setCreateForm] = useState({
    title: '', description: '', class_id: '', term_id: '', subject_id: '',
    time_limit_minutes: 10, require_payment: false, school_id: '',
  })
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { question_text: '', points: 5, options: [
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ]}
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadQuizzes()
    Promise.all([
      api.get('/api/classes'),
      api.get('/api/terms'),
      api.get('/api/subjects'),
      api.get('/api/schools'),
    ]).then(([cl, te, su, sc]) => {
      setClasses(cl.data?.value ?? cl.data ?? [])
      setTerms(te.data?.value ?? te.data ?? [])
      setSubjects(su.data?.value ?? su.data ?? [])
      const schools = sc.data?.value ?? sc.data ?? []
      if (schools[0]) setCreateForm(f => ({ ...f, school_id: schools[0].id }))
    }).catch(() => {})
  }, [])

  async function loadQuizzes() {
    setLoading(true)
    try {
      const res = await api.get('/api/quizzes')
      setQuizzes(res.data?.value ?? res.data ?? [])
    } catch { toast.error('Failed to load quizzes') }
    finally { setLoading(false) }
  }

  // ── Take quiz ──────────────────────────────────────────────────────────────

  async function openQuiz(quiz: Quiz) {
    try {
      const res = await api.get(`/api/quizzes/${quiz.id}`)
      setActiveQuiz(res.data)
      setAnswers({})
      setSubmitted(false)
      setScore(null)
      setTakingQuiz(true)
      if (quiz.time_limit_minutes) {
        setTimeLeft(quiz.time_limit_minutes * 60)
      }
    } catch (e: any) {
      if (e?.response?.status === 402) {
        toast.error('You must pay your fees before taking this quiz')
      } else {
        toast.error(e?.response?.data?.message ?? 'Failed to load quiz')
      }
    }
  }

  // Timer countdown
  useEffect(() => {
    if (!takingQuiz || submitted || timeLeft === null) return
    if (timeLeft <= 0) { submitQuiz(); return }
    timerRef.current = setInterval(() => setTimeLeft(t => (t ?? 1) - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [takingQuiz, submitted, timeLeft])

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function submitQuiz() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!activeQuiz) return
    let earned = 0, total = 0
    activeQuiz.quiz_questions.forEach(q => {
      total += q.points
      const chosen = answers[q.id]
      const correct = q.quiz_question_options.find(o => o.is_correct)
      if (chosen && chosen === correct?.id) earned += q.points
    })
    setScore({ earned, total })
    setSubmitted(true)
  }

  // ── Toggle publish ─────────────────────────────────────────────────────────

  async function togglePublish(quiz: Quiz) {
    try {
      await api.put(`/api/quizzes/${quiz.id}`, { is_published: !quiz.is_published })
      toast.success(quiz.is_published ? 'Quiz unpublished' : 'Quiz published')
      loadQuizzes()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to update quiz')
    }
  }

  async function deleteQuiz(id: string) {
    if (!confirm('Delete this quiz?')) return
    try {
      await api.delete(`/api/quizzes/${id}`)
      toast.success('Quiz deleted')
      loadQuizzes()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to delete quiz')
    }
  }

  // ── Create quiz ────────────────────────────────────────────────────────────

  function addQuestion() {
    setQuestions(q => [...q, {
      question_text: '', points: 5,
      options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ]
    }])
  }

  function removeQuestion(qi: number) {
    setQuestions(q => q.filter((_, i) => i !== qi))
  }

  function updateQuestion(qi: number, field: string, value: any) {
    setQuestions(q => q.map((item, i) => i === qi ? { ...item, [field]: value } : item))
  }

  function updateOption(qi: number, oi: number, field: string, value: any) {
    setQuestions(q => q.map((item, i) => i !== qi ? item : {
      ...item,
      options: item.options.map((opt, j) => {
        if (field === 'is_correct') {
          // radio — only one correct
          return { ...opt, is_correct: j === oi }
        }
        return j === oi ? { ...opt, [field]: value } : opt
      })
    }))
  }

  function addOption(qi: number) {
    setQuestions(q => q.map((item, i) => i !== qi ? item : {
      ...item, options: [...item.options, { option_text: '', is_correct: false }]
    }))
  }

  function removeOption(qi: number, oi: number) {
    setQuestions(q => q.map((item, i) => i !== qi ? item : {
      ...item, options: item.options.filter((_, j) => j !== oi)
    }))
  }

  async function createQuiz() {
    if (!createForm.title.trim()) return toast.error('Title is required')
    if (questions.some(q => !q.question_text.trim())) return toast.error('All questions need text')
    setSaving(true)
    try {
      await api.post('/api/quizzes', {
        ...createForm,
        time_limit_minutes: Number(createForm.time_limit_minutes),
        questions: questions.map(q => ({
          question_text: q.question_text,
          points: q.points,
          options: q.options,
        }))
      })
      toast.success('Quiz created')
      setShowCreate(false)
      loadQuizzes()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create quiz')
    } finally { setSaving(false) }
  }

  const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"

  // ── Taking quiz view ───────────────────────────────────────────────────────

  if (takingQuiz && activeQuiz) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-white border rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{activeQuiz.title}</h2>
            <p className="text-sm text-gray-500">{activeQuiz.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {timeLeft !== null && !submitted && (
              <div className={`text-lg font-mono font-bold px-3 py-1 rounded-lg ${
                timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-700'
              }`}>
                {formatTime(timeLeft)}
              </div>
            )}
            <button onClick={() => setTakingQuiz(false)}
              className="text-sm text-gray-500 hover:text-gray-900">✕ Exit</button>
          </div>
        </div>

        {/* Result */}
        {submitted && score && (
          <div className={`rounded-xl px-5 py-4 border text-center ${
            score.earned / score.total >= 0.7
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="text-3xl font-bold mb-1">
              {score.earned} / {score.total}
            </div>
            <div className="text-sm text-gray-600">
              {Math.round((score.earned / score.total) * 100)}% —{' '}
              {score.earned / score.total >= 0.7 ? '🎉 Well done!' : 'Keep practising!'}
            </div>
          </div>
        )}

        {/* Questions */}
        {activeQuiz.quiz_questions.map((q, qi) => {
          const chosen = answers[q.id]
          // const correct = q.quiz_question_options.find(o => o.is_correct)
          return (
            <div key={q.id} className="bg-white border rounded-xl px-5 py-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-gray-900">
                  <span className="text-violet-600 font-bold mr-2">Q{qi + 1}.</span>
                  {q.question_text}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{q.points} pts</span>
              </div>
              <div className="space-y-2">
                {q.quiz_question_options.map(opt => {
                  let bg = 'border-gray-200 hover:border-violet-300'
                  if (submitted) {
                    if (opt.is_correct) bg = 'border-green-400 bg-green-50'
                    else if (chosen === opt.id) bg = 'border-red-400 bg-red-50'
                  } else if (chosen === opt.id) {
                    bg = 'border-violet-500 bg-violet-50'
                  }
                  return (
                    <button
                      key={opt.id}
                      disabled={submitted}
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.id }))}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${bg}`}
                    >
                      {opt.option_text}
                      {submitted && opt.is_correct && (
                        <span className="ml-2 text-green-600 font-medium">✓</span>
                      )}
                      {submitted && chosen === opt.id && !opt.is_correct && (
                        <span className="ml-2 text-red-600 font-medium">✗</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Submit button */}
        {!submitted && (
          <button
            onClick={submitQuiz}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
          >
            Submit Quiz
          </button>
        )}

        {submitted && (
          <button
            onClick={() => setTakingQuiz(false)}
            className="w-full py-3 border hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
          >
            Back to Quizzes
          </button>
        )}
      </div>
    )
  }

  // ── Quiz list view ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quizzes</h1>
          <p className="text-sm text-gray-500">Create and manage quizzes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Create Quiz
        </button>
      </div>

      {/* Quiz cards */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No quizzes yet</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white border rounded-xl p-4 space-y-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900">{quiz.title}</div>
                  {quiz.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{quiz.description}</div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Badge
                    label={quiz.is_published ? 'Published' : 'Draft'}
                    color={quiz.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                  />
                  {quiz.require_payment && (
                    <Badge label="Paid" color="bg-amber-100 text-amber-700" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {quiz.classes && <span>📚 {quiz.classes.name}</span>}
                {quiz.terms && <span>📅 {quiz.terms.name}</span>}
                {quiz.subjects && <span>📖 {quiz.subjects.name}</span>}
                {quiz.time_limit_minutes && <span>⏱ {quiz.time_limit_minutes} min</span>}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => openQuiz(quiz)}
                  className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Take Quiz
                </button>
                <button
                  onClick={() => togglePublish(quiz)}
                  className="px-3 py-1.5 border hover:bg-gray-50 text-xs font-medium rounded-lg transition-colors"
                >
                  {quiz.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => deleteQuiz(quiz.id)}
                  className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create quiz modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Create Quiz</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input className={inp} value={createForm.title}
                  onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className={inp} value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select className={inp} value={createForm.class_id}
                  onChange={e => setCreateForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">— Select —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                <select className={inp} value={createForm.term_id}
                  onChange={e => setCreateForm(f => ({ ...f, term_id: e.target.value }))}>
                  <option value="">— Select —</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.academic_year}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select className={inp} value={createForm.subject_id}
                  onChange={e => setCreateForm(f => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">— Select —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (mins)</label>
                <input className={inp} type="number" min={1} value={createForm.time_limit_minutes}
                  onChange={e => setCreateForm(f => ({ ...f, time_limit_minutes: Number(e.target.value) }))} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="req_pay" checked={createForm.require_payment}
                  onChange={e => setCreateForm(f => ({ ...f, require_payment: e.target.checked }))} />
                <label htmlFor="req_pay" className="text-sm text-gray-700">Require fee payment to take this quiz</label>
              </div>
            </div>

            {/* Questions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm text-gray-700">Questions ({questions.length})</span>
                <button onClick={addQuestion}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Add Question</button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {questions.map((q, qi) => (
                  <div key={qi} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Question {qi + 1}</span>
                      {questions.length > 1 && (
                        <button onClick={() => removeQuestion(qi)}
                          className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      )}
                    </div>
                    <input className={inp} placeholder="Question text"
                      value={q.question_text}
                      onChange={e => updateQuestion(qi, 'question_text', e.target.value)} />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Points:</label>
                      <input className="border rounded px-2 py-1 text-sm w-16" type="number" min={1}
                        value={q.points} onChange={e => updateQuestion(qi, 'points', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500 font-medium">Options (select correct answer)</div>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" name={`q${qi}_correct`} checked={opt.is_correct}
                            onChange={() => updateOption(qi, oi, 'is_correct', true)} />
                          <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                            placeholder={`Option ${oi + 1}`}
                            value={opt.option_text}
                            onChange={e => updateOption(qi, oi, 'option_text', e.target.value)} />
                          {q.options.length > 2 && (
                            <button onClick={() => removeOption(qi, oi)}
                              className="text-xs text-red-400 hover:text-red-600">✕</button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addOption(qi)}
                        className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Add Option</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={createQuiz} disabled={saving}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
              {saving ? 'Creating…' : 'Create Quiz'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}