import  { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { useAuth } from '../hooks/useAuth'

interface Stats {
  students: number
  teachers: number
  classes: number
  subjects: number
  terms: number
  enrollments: number
}

interface RecentResult {
  student_name: string
  subject_name: string
  grade: string
  total_score: number
  term_name: string
}

interface RecentPayment {
  id: string
  amount: number
  status: string
  paid_at: string
  students: { users: { full_name: string } }
}

const fmt = (n: number) => '₦' + Number(n).toLocaleString('en-NG')

function StatCard({
  label, value, icon, to, color,
}: {
  label: string; value: number | string; icon: string; to: string; color: string
}) {
  return (
    <Link to={to} className={`${color} border rounded-xl px-4 py-4 flex items-center gap-4 hover:shadow-md transition-shadow`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm opacity-70">{label}</div>
      </div>
    </Link>
  )
}

const GRADE_COLOR: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-700',
  'A':  'bg-green-100 text-green-700',
  'B':  'bg-blue-100 text-blue-700',
  'C':  'bg-yellow-100 text-yellow-700',
  'D':  'bg-orange-100 text-orange-700',
  'E':  'bg-red-100 text-red-700',
  'F':  'bg-red-200 text-red-800',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const role = (user as any)?.role ?? 'student'
  const name = (user as any)?.full_name ?? 'there'

  const [stats, setStats] = useState<Stats>({
    students: 0, teachers: 0, classes: 0,
    subjects: 0, terms: 0, enrollments: 0,
  })
  const [recentResults, setRecentResults] = useState<RecentResult[]>([])
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [st, th, cl, su, te, en, re, pa] = await Promise.all([
          api.get('/api/students'),
          api.get('/api/teachers'),
          api.get('/api/classes'),
          api.get('/api/subjects'),
          api.get('/api/terms'),
          api.get('/api/enrollments'),
          api.get('/api/results'),
          api.get('/api/payments/history'),
        ])
        setStats({
          students:    (st.data?.value ?? st.data ?? []).length,
          teachers:    (th.data?.value ?? th.data ?? []).length,
          classes:     (cl.data?.value ?? cl.data ?? []).length,
          subjects:    (su.data?.value ?? su.data ?? []).length,
          terms:       (te.data?.value ?? te.data ?? []).length,
          enrollments: (en.data?.value ?? en.data ?? []).length,
        })
        const results: RecentResult[] = (re.data?.value ?? re.data ?? [])
          .slice(0, 5)
        setRecentResults(results)
        const payments: RecentPayment[] = (pa.data?.value ?? pa.data ?? [])
          .slice(0, 5)
        setRecentPayments(payments)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-800 rounded-2xl px-6 py-5 text-white">
        <div className="text-lg font-semibold">{greeting()}, {name.split(' ')[0]} 👋</div>
        <div className="text-sm opacity-80 mt-0.5 capitalize">{role} Portal</div>
        <div className="text-xs opacity-60 mt-2">
          {new Date().toLocaleDateString('en-NG', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Students"    value={stats.students}    icon="👨‍🎓" to="/students"   color="bg-violet-50 border-violet-200 text-violet-800" />
          <StatCard label="Teachers"    value={stats.teachers}    icon="👩‍🏫" to="/admin"      color="bg-blue-50 border-blue-200 text-blue-800" />
          <StatCard label="Classes"     value={stats.classes}     icon="🏫" to="/admin"      color="bg-green-50 border-green-200 text-green-800" />
          <StatCard label="Subjects"    value={stats.subjects}    icon="📚" to="/admin"      color="bg-amber-50 border-amber-200 text-amber-800" />
          <StatCard label="Terms"       value={stats.terms}       icon="📅" to="/admin"      color="bg-pink-50 border-pink-200 text-pink-800" />
          <StatCard label="Enrollments" value={stats.enrollments} icon="📋" to="/admin"      color="bg-teal-50 border-teal-200 text-teal-800" />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Take Attendance', icon: '✅', to: '/attendance', color: 'bg-green-600' },
            { label: 'View Results',    icon: '📊', to: '/results',    color: 'bg-blue-600' },
            { label: 'Pay Fees',        icon: '💰', to: '/fees',       color: 'bg-amber-600' },
            { label: 'Open Chat',       icon: '💬', to: '/chat',       color: 'bg-violet-600' },
          ].map(({ label, icon, to, color }) => (
            <Link
              key={to}
              to={to}
              className={`${color} text-white rounded-xl px-4 py-3 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-medium text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent results */}
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Recent Results</h2>
            <Link to="/results" className="text-xs text-violet-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
            </div>
          ) : recentResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results yet</div>
          ) : (
            <div className="divide-y">
              {recentResults.map((r, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.student_name}</div>
                    <div className="text-xs text-gray-500">{r.subject_name} · {r.term_name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">{r.total_score}%</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${GRADE_COLOR[r.grade] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Recent Payments</h2>
            <Link to="/fees" className="text-xs text-violet-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
            </div>
          ) : recentPayments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No payments yet</div>
          ) : (
            <div className="divide-y">
              {recentPayments.map((p, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {p.students?.users?.full_name ?? '—'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-NG', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      }) : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">{fmt(p.amount)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      p.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}