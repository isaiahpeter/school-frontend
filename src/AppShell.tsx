import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useSchool } from './context/SchoolContext'
import { useAuth } from './hooks/useAuth'

export default function AppShell() {
  const { school } = useSchool()
  const { user, logout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const primary = '#7c3aed'
    document.documentElement.style.setProperty('--school-primary', primary)
    document.title = school?.name ? `${school.name} • School Portal` : 'School Portal'
  }, [school])

  const nav = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Students', to: '/students' },
    { label: 'Visitors', to: '/visitors' },
    { label: 'Capture', to: '/capture' },
    { label: 'Settings', to: '/settings' },
    { label: 'Results', to: '/results' },
    { label: 'Fees', to: '/fees' },
    { label: 'Chat', to: '/chat' },
    { label: 'Quizzes', to: '/quizzes' },
    { label: 'Admin', to: '/admin' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-lg">
              {school?.name?.[0] ?? 'S'}
            </div>
            <div>
              <div className="font-semibold">{school?.name ?? 'School'}</div>
              <div className="text-xs text-gray-500">Multi-tenant portal</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            {nav.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className={
                  location.pathname === to || location.pathname.startsWith(to + '/')
                    ? 'font-semibold text-violet-600'
                    : 'text-gray-600 hover:text-gray-900'
                }
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block text-gray-500">{user?.full_name ?? user?.email}</span>
            <button
              onClick={logout}
              className="rounded-lg px-3 py-1.5 border text-sm hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}