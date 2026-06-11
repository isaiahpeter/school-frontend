import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Term { id: string; name: string; academic_year: string }
interface Class { id: string; name: string; section: string }
interface Student { id: string; users: { full_name: string } }

interface FeeItem {
  id: string
  item_name: string
  amount: number
  category: 'tuition' | 'admission' | 'other' | 'extra'
}

interface FeeStructure {
  tuition: number
  admission: number
  other: number
  extra: number
  total: number
  items: FeeItem[]
}

interface StudentBalance {
  totalFee: number
  totalPaid: number
  balance: number
  discount?: { discount_type: string; discount_value: number; reason?: string }
}

interface Payment {
  id: string
  amount: number
  reference: string
  status: string
  paid_at: string
  channel: string
  term_id: string
  students: { users: { full_name: string } }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })

const CATEGORY_COLORS: Record<string, string> = {
  tuition:   'bg-blue-100 text-blue-700',
  admission: 'bg-purple-100 text-purple-700',
  extra:     'bg-amber-100 text-amber-700',
  other:     'bg-gray-100 text-gray-600',
}

const STATUS_COLORS: Record<string, string> = {
  success:  'bg-green-100 text-green-700',
  pending:  'bg-yellow-100 text-yellow-700',
  failed:   'bg-red-100 text-red-700',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${color}`}>
      {label}
    </span>
  )
}

function StatCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: 'green' | 'red'
}) {
  return (
    <div className="bg-white border rounded-xl px-4 py-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${
        highlight === 'green' ? 'text-green-600' :
        highlight === 'red'   ? 'text-red-600'   : 'text-gray-900'
      }`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'structure' | 'balance' | 'history'

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const [terms, setTerms]       = useState<Term[]>([])
  const [classes, setClasses]   = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const [selectedTerm,    setSelectedTerm]    = useState('')
  const [selectedClass,   setSelectedClass]   = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')

  const [tab, setTab] = useState<Tab>('structure')

  const [structure, setStructure]       = useState<FeeStructure | null>(null)
  const [balance,   setBalance]         = useState<StudentBalance | null>(null)
  const [payments,  setPayments]        = useState<Payment[]>([])

  const [loadingStructure, setLoadingStructure] = useState(false)
  const [loadingBalance,   setLoadingBalance]   = useState(false)
  const [loadingPayments,  setLoadingPayments]  = useState(false)
  const [loadingInitiate,  setLoadingInitiate]  = useState(false)

  const [error, setError] = useState<string | null>(null)

  // Load dropdowns on mount
  useEffect(() => {
    Promise.all([
      api.get('/api/terms'),
      api.get('/api/classes'),
      api.get('/api/students'),
    ]).then(([t, c, s]) => {
      const termList    = t.data?.value ?? t.data ?? []
      const classList   = c.data?.value ?? c.data ?? []
      const studentList = s.data?.value ?? s.data ?? []
      setTerms(termList)
      setClasses(classList)
      setStudents(studentList)
      if (termList[0])    setSelectedTerm(termList[0].id)
      if (classList[0])   setSelectedClass(classList[0].id)
      if (studentList[0]) setSelectedStudent(studentList[0].id)
    }).catch(() => setError('Failed to load initial data'))
  }, [])

  // Fee structure
  useEffect(() => {
    if (!selectedTerm || !selectedClass || tab !== 'structure') return
    setLoadingStructure(true)
    setStructure(null)
    api.get('/api/fees/structure', {
      params: { class_id: selectedClass, term_id: selectedTerm }
    })
      .then(res => setStructure(res.data))
      .catch(() => setError('Failed to load fee structure'))
      .finally(() => setLoadingStructure(false))
  }, [selectedTerm, selectedClass, tab])

  // Student balance
  useEffect(() => {
    if (!selectedTerm || !selectedStudent || tab !== 'balance') return
    setLoadingBalance(true)
    setBalance(null)
    api.get('/api/fees/student-balance', {
      params: { student_id: selectedStudent, term_id: selectedTerm }
    })
      .then(res => setBalance(res.data))
      .catch(() => setError('Failed to load student balance'))
      .finally(() => setLoadingBalance(false))
  }, [selectedTerm, selectedStudent, tab])

  // Payment history
  useEffect(() => {
    if (!selectedStudent || tab !== 'history') return
    setLoadingPayments(true)
    setPayments([])
    api.get('/api/payments/history', {
      params: { student_id: selectedStudent, term_id: selectedTerm || undefined }
    })
      .then(res => setPayments(res.data?.value ?? res.data ?? []))
      .catch(() => setError('Failed to load payment history'))
      .finally(() => setLoadingPayments(false))
  }, [selectedStudent, selectedTerm, tab])

  // Initiate payment
  async function initiatePayment(amount?: number) {
    if (!selectedStudent || !selectedTerm) return
    setLoadingInitiate(true)
    setError(null)
    try {
      const body: any = { student_id: selectedStudent, term_id: selectedTerm }
      if (amount) body.amount = amount
      const res = await api.post('/api/payments/initiate', body)
      const url = res.data?.authorization_url ?? res.data?.data?.authorization_url
      if (url) window.open(url, '_blank')
      else setError('No payment URL returned')
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to initiate payment')
    } finally {
      setLoadingInitiate(false)
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'structure', label: 'Fee Structure' },
    { key: 'balance',   label: 'Student Balance' },
    { key: 'history',   label: 'Payment History' },
  ]

  const studentName = (id: string) =>
    students.find(s => s.id === id)?.users?.full_name ?? '—'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Fees & Payments</h1>
        <p className="text-sm text-gray-500">Fee structures, student balances, and payment history</p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Global filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="border rounded-lg px-3 py-2 text-sm bg-white"
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
        >
          <option value="">— Select Term —</option>
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.name} — {t.academic_year}</option>
          ))}
        </select>

        {tab === 'structure' && (
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">— Select Class —</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.section}</option>
            ))}
          </select>
        )}

        {(tab === 'balance' || tab === 'history') && (
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="">— Select Student —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.users?.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(null) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Fee Structure ── */}
      {tab === 'structure' && (
        <div className="space-y-4">
          {loadingStructure ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : structure ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
  <StatCard label="Tuition"   value={fmt(structure.tuition)} />
  <StatCard label="Admission" value={fmt(structure.admission)} />
  <StatCard label="Other"     value={fmt(structure.other)} />
  <StatCard label="Extra"     value={fmt(structure.extra)} />
</div>
<div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex justify-between items-center">
  <span className="text-sm font-medium text-violet-700">Grand Total</span>
  <span className="text-xl font-bold text-violet-700">{fmt(structure.total)}</span>
</div>

              {/* Items table */}
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b text-sm font-medium text-gray-700">
                  Fee Items ({structure.items.length})
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {structure.items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.item_name}</td>
                        <td className="px-4 py-3">
                          <Badge
                            label={item.category}
                            color={CATEGORY_COLORS[item.category] ?? 'bg-gray-100 text-gray-600'}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700">
                          {fmt(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <td className="px-4 py-3 text-right font-bold font-mono text-gray-900">
  {fmt(structure.total)}
</td>
                </table>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-400 text-center py-10">
              Select a class and term to view fee structure
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Student Balance ── */}
      {tab === 'balance' && (
        <div className="space-y-4">
          {loadingBalance ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : balance ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Fee"  value={fmt(balance.totalFee)} />
                <StatCard label="Total Paid" value={fmt(balance.totalPaid)} highlight="green" />
                <StatCard
                  label="Balance Due"
                  value={fmt(balance.balance)}
                  highlight={balance.balance > 0 ? 'red' : 'green'}
                  sub={balance.balance <= 0 ? 'No outstanding balance' : 'Payment required'}
                />
              </div>

              {/* Discount info */}
              {balance.discount && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                  <span className="font-medium text-amber-700">Discount applied: </span>
                  <span className="text-amber-600">
                    {balance.discount.discount_type === 'percentage'
                      ? `${balance.discount.discount_value}%`
                      : fmt(balance.discount.discount_value)}
                    {balance.discount.reason ? ` — ${balance.discount.reason}` : ''}
                  </span>
                </div>
              )}

              {/* Payment CTA */}
              {balance.balance > 0 && (
                <div className="bg-white border rounded-xl p-4 space-y-3">
                  <div className="font-medium text-gray-700">Make a Payment</div>
                  <div className="text-sm text-gray-500">
                    Outstanding balance for <strong>{studentName(selectedStudent)}</strong>:{' '}
                    <strong className="text-red-600">{fmt(balance.balance)}</strong>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => initiatePayment()}
                      disabled={loadingInitiate}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
                    >
                      {loadingInitiate ? 'Redirecting…' : `Pay Full Balance — ${fmt(balance.balance)}`}
                    </button>
                    <button
                      onClick={() => {
                        const amt = prompt('Enter amount to pay (in Naira, numbers only):')
                        if (amt && !isNaN(Number(amt))) initiatePayment(Number(amt))
                      }}
                      disabled={loadingInitiate}
                      className="px-4 py-2 border hover:bg-gray-50 text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
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
            </>
          ) : (
            <div className="text-sm text-gray-400 text-center py-10">
              Select a student and term to view balance
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Payment History ── */}
      {tab === 'history' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b text-sm text-gray-500">
            {loadingPayments ? 'Loading…' : `${payments.length} payment${payments.length !== 1 ? 's' : ''}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide text-left">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingPayments ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {p.students?.users?.full_name ?? studentName(p.students.id?? '')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmt(p.amount)}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{p.channel ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          label={p.status}
                          color={STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.paid_at
                          ? new Date(p.paid_at).toLocaleDateString('en-NG', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://school-api-e09o.onrender.com/api/payments/receipt/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-violet-600 hover:underline"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>
      )}
    </div>
  )
}