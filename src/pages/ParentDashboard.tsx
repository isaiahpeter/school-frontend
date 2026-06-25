import  { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Child {
  student_id: string
  students: { users: { full_name: string; email?: string } }
}

interface Term { id: string; name: string; academic_year: string }

interface Result {
  id: string
  test_score: number
  exam_score: number
  total_score: number
  percentage: number
  grade: string
  remark: string
  subjects: { name: string; code: string }
}

interface FeeBalance {
  totalFee: number
  totalPaid: number
  balance: number
  discount?: { discount_type: string; discount_value: number; reason?: string }
  items?: { id: string; item_name: string; amount: number; category: string }[]
}

interface Payment {
  id: string
  amount: number
  reference: string
  status: string
  paid_at: string
  channel: string
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  classes?: { name: string }
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

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent:  'bg-red-100 text-red-700',
  late:    'bg-yellow-100 text-yellow-700',
  excused: 'bg-gray-100 text-gray-600',
}

const fmt = (n: number) =>
  '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const [children,    setChildren]    = useState<Child[]>([])
  const [terms,       setTerms]       = useState<Term[]>([])
  const [activeChild, setActiveChild] = useState<Child | null>(null)
  const [activeTerm,  setActiveTerm]  = useState<Term | null>(null)

  const [results,    setResults]    = useState<Result[]>([])
  const [balance,    setBalance]    = useState<FeeBalance | null>(null)
  const [payments,   setPayments]   = useState<Payment[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [reportHtml, setReportHtml] = useState<string | null>(null)

  const [tab,            setTab]            = useState<'results' | 'fees' | 'attendance' | 'report'>('results')
  const [loading,        setLoading]        = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [initiating,     setInitiating]     = useState(false)

  // ── Load children + terms on mount ────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/api/users/my-children'),
      api.get('/api/terms'),
    ]).then(([ch, te]) => {
      // my-children returns array directly (not wrapped in {value})
      const childList: Child[] = Array.isArray(ch.data)
        ? ch.data
        : (ch.data?.value ?? [])
      // terms returns array directly
      const termList: Term[] = Array.isArray(te.data)
        ? te.data
        : (te.data?.value ?? [])

      setChildren(childList)
      setTerms(termList)
      if (childList[0]) setActiveChild(childList[0])
      if (termList[0])  setActiveTerm(termList[0])
    }).catch(() => toast.error('Failed to load data'))
    .finally(() => setLoading(false))
  }, [])

  // ── Load child data when child or term changes ─────────────────────────────
  useEffect(() => {
    if (!activeChild || !activeTerm) return
    const sid = activeChild.student_id
    const tid = activeTerm.id
    setLoadingDetails(true)
    setResults([])
    setBalance(null)
    setPayments([])
    setAttendance([])
    setReportHtml(null)

    Promise.allSettled([
      api.get(`/api/results/student/${sid}/term/${tid}`),
      api.get('/api/fees/my-balance', { params: { student_id: sid, term_id: tid } }),
      api.get('/api/payments/my-history', { params: { student_id: sid, term_id: tid } }),
      api.get('/api/attendance', { params: { student_id: sid } }),
    ]).then(([re, ba, pa, at]) => {
      if (re.status === 'fulfilled') {
        const r = re.value.data
        setResults(Array.isArray(r) ? r : (r?.value ?? []))
      }
      if (ba.status === 'fulfilled') {
        setBalance(ba.value.data)
      }
      if (pa.status === 'fulfilled') {
        const p = pa.value.data
        setPayments(Array.isArray(p) ? p : (p?.value ?? []))
      }
      if (at.status === 'fulfilled') {
        const a = at.value.data
        setAttendance(Array.isArray(a) ? a : (a?.value ?? []))
      }
    }).finally(() => setLoadingDetails(false))
  }, [activeChild, activeTerm])

  // ── Load report card ───────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'report' || !activeChild || !activeTerm) return
    setReportHtml(null)
    api.get(
      `/api/results/report/${activeChild.student_id}/term/${activeTerm.id}`,
      { params: { format: 'html' }, responseType: 'text' }
    ).then(res => setReportHtml(res.data))
     .catch(() => setReportHtml('<p style="color:red;padding:1rem">Failed to load report card.</p>'))
  }, [tab, activeChild?.student_id, activeTerm?.id])

  async function initiatePayment(amount?: number) {
    if (!activeChild || !activeTerm) return
    setInitiating(true)
    try {
      const body: any = { student_id: activeChild.student_id, term_id: activeTerm.id }
      if (amount) body.amount = amount
      const res = await api.post('/api/payments/initiate', body)
      const url = res.data?.authorization_url
      if (url) window.open(url, '_blank')
      else toast.error('No payment URL returned')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to initiate payment')
    } finally { setInitiating(false) }
  }

  async function downloadReceipt(paymentId: string) {
  try {
    const res = await api.get(`/api/payments/${paymentId}/receipt`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `receipt-${paymentId}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    toast.error('Failed to download receipt')
  }
}
  const avg = results.length
    ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
    : 0

  const attSummary = attendance.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1; return acc
  }, {} as Record<string, number>)

  const childName = activeChild?.students?.users?.full_name ?? 'Child'

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  // ── No children linked ─────────────────────────────────────────────────────
  if (children.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">👨‍👩‍👧</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">No children linked</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Your account is not yet linked to any student.
          Please contact the school admin to link your child's account.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Parent Dashboard</h1>
        <p className="text-sm text-gray-500">Monitor your child's academic progress</p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        {children.length > 1 && (
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={activeChild?.student_id ?? ''}
            onChange={e => {
              const c = children.find(x => x.student_id === e.target.value)
              if (c) setActiveChild(c)
            }}
          >
            {children.map(c => (
              <option key={c.student_id} value={c.student_id}>
                {c.students?.users?.full_name}
              </option>
            ))}
          </select>
        )}
        <select
          className="border rounded-lg px-3 py-2 text-sm bg-white"
          value={activeTerm?.id ?? ''}
          onChange={e => {
            const t = terms.find(x => x.id === e.target.value)
            if (t) setActiveTerm(t)
          }}
        >
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>
          ))}
        </select>
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-800 rounded-2xl px-5 py-4 text-white">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl shrink-0">
            {childName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">{childName}</div>
            <div className="text-sm opacity-80">{activeTerm?.name} — {activeTerm?.academic_year}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold">{avg}%</div>
            <div className="text-xs opacity-70">Term Avg</div>
          </div>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-violet-600">{results.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Subjects</div>
        </div>
        <div className="bg-white border rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-green-600">{attSummary.present ?? 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">Present</div>
        </div>
        <div className="bg-white border rounded-xl px-4 py-3 text-center">
          <div className="text-2xl font-bold text-red-500">{attSummary.absent ?? 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">Absent</div>
        </div>
        <div className="bg-white border rounded-xl px-4 py-3 text-center">
          <div className={`text-2xl font-bold ${(balance?.balance ?? 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {balance ? (balance.balance > 0 ? fmt(balance.balance) : '✓ Paid') : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Balance</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {([
          { key: 'results',    label: '📊 Results' },
          { key: 'fees',       label: '💰 Fees' },
          { key: 'attendance', label: '✅ Attendance' },
          { key: 'report',     label: '📄 Report Card' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === key
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Loading spinner */}
      {loadingDetails && (
        <div className="py-12 text-center animate-pulse text-sm text-gray-400">
          Loading {childName}'s data…
        </div>
      )}

      {!loadingDetails && (
        <>
          {/* ── Results ── */}
          {tab === 'results' && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b text-sm text-gray-500">
                {results.length} subjects
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Test /40</th>
                      <th className="px-4 py-3">Exam /60</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                          No results for this term
                        </td>
                      </tr>
                    ) : results.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{r.subjects?.name}</div>
                          <div className="text-xs text-gray-400">{r.subjects?.code}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{r.test_score}</td>
                        <td className="px-4 py-3 text-gray-700">{r.exam_score}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{r.total_score}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[r.grade] ?? 'bg-gray-100 text-gray-600'}`}>
                            {r.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Fees ── */}
          {tab === 'fees' && (
            <div className="space-y-4">
              {!balance ? (
                <div className="text-center py-10 text-sm text-gray-400">
                  No fee information for this term
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border rounded-xl px-4 py-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Fee</div>
                      <div className="text-xl font-bold text-gray-900">{fmt(balance.totalFee)}</div>
                    </div>
                    <div className="bg-white border rounded-xl px-4 py-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Paid</div>
                      <div className="text-xl font-bold text-green-600">{fmt(balance.totalPaid)}</div>
                    </div>
                    <div className="bg-white border rounded-xl px-4 py-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Balance</div>
                      <div className={`text-xl font-bold ${balance.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {balance.balance <= 0 ? '✓ Cleared' : fmt(balance.balance)}
                      </div>
                    </div>
                  </div>

                  {balance.discount && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                      <span className="font-medium text-amber-700">Discount: </span>
                      <span className="text-amber-600">
                        {balance.discount.discount_type === 'percentage'
                          ? `${balance.discount.discount_value}%`
                          : fmt(balance.discount.discount_value)}
                        {balance.discount.reason ? ` — ${balance.discount.reason}` : ''}
                      </span>
                    </div>
                  )}

                  {balance.balance > 0 && (
                    <div className="bg-white border rounded-xl p-4 space-y-3">
                      <div className="font-medium text-gray-700">
                        Make Payment for {childName}
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => initiatePayment()}
                          disabled={initiating}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
                        >
                          {initiating ? 'Redirecting…' : `Pay Full — ${fmt(balance.balance)}`}
                        </button>
                        <button
                          onClick={() => {
                            const amt = prompt('Enter amount (numbers only):')
                            if (amt && !isNaN(Number(amt))) initiatePayment(Number(amt))
                          }}
                          disabled={initiating}
                          className="px-4 py-2 border text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
                        >
                          Pay Custom Amount
                        </button>
                      </div>
                    </div>
                  )}

                  {balance.balance <= 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-700 font-medium text-center">
                      ✓ All fees fully paid for this term
                    </div>
                  )}

                  {/* Payment history */}
                  <div className="bg-white border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b text-sm font-medium text-gray-700">
                      Payment History ({payments.length})
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                          <tr>
                            <th className="px-4 py-3">Reference</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {payments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                No payments this term
                              </td>
                            </tr>
                          ) : payments.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                {p.reference}
                              </td>
                              <td className="px-4 py-3 font-semibold">{fmt(p.amount)}</td>
                              <td className="px-4 py-3 text-gray-600">
                                {p.paid_at
                                  ? new Date(p.paid_at).toLocaleDateString('en-NG', {
                                      day: '2-digit', month: 'short', year: 'numeric'
                                    })
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  p.status === 'success'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
  onClick={() => downloadReceipt(p.id)}
  className="text-xs text-violet-600 hover:underline"
>
  Download
</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Attendance ── */}
          {tab === 'attendance' && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b text-sm text-gray-500">
                {attendance.length} records
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                          No attendance records
                        </td>
                      </tr>
                    ) : [...attendance]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map(a => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{a.date}</td>
                            <td className="px-4 py-3 text-gray-600">{a.classes?.name ?? '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Report Card ── */}
          {tab === 'report' && (
            <div className="bg-white border rounded-xl overflow-hidden">
              {!reportHtml ? (
                <div className="p-10 text-center text-sm text-gray-400 animate-pulse">
                  Generating report card…
                </div>
              ) : (
                <iframe
                  srcDoc={reportHtml}
                  className="w-full"
                  style={{ height: '80vh', border: 'none' }}
                  title="Report Card"
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
