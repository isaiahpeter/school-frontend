import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useSchool } from './context/SchoolContext'
import { useAuth } from './hooks/useAuth'

const ALL_NAV = [
  { label: 'Dashboard', to: '/dashboard',  icon: '🏠', roles: ['admin','teacher','student','parent'] },
  { label: 'Students',  to: '/students',   icon: '👨‍🎓', roles: ['admin','teacher'] },
  { label: 'Results',   to: '/results',    icon: '📊', roles: ['admin','teacher','student','parent'] },
  { label: 'Fees',      to: '/fees',       icon: '💰', roles: ['admin','student','parent'] },
  { label: 'Attendance',to: '/attendance', icon: '✅', roles: ['admin','teacher','student'] },
  { label: 'Chat',      to: '/chat',       icon: '💬', roles: ['admin','teacher','student'] },
  { label: 'Quizzes',   to: '/quizzes',    icon: '📝', roles: ['admin','teacher','student'] },
  { label: 'Admin',     to: '/admin',      icon: '⚙️',  roles: ['admin'] },
  { label: 'Settings',  to: '/settings',   icon: '🔧', roles: ['admin','teacher','student','parent'] },
  { label: 'Enter Marks', to: '/enter-marks', icon: '✏️', roles: ['admin','teacher'] },
]

export default function AppShell() {
  const { school } = useSchool()
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const role = (user as any)?.role ?? 'student'
  const nav = ALL_NAV.filter(n => n.roles.includes(role))

  // Bottom nav shows first 5 items for mobile
  const bottomNav = nav.slice(0, 5)

  useEffect(() => {
    document.title = school?.name ? `${school.name} • Portal` : 'School Portal'
  }, [school])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* ── Top header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <img
  src="/school-logo.png"
  alt={school?.name ?? 'School'}
  className="h-8 w-8 shrink-0 rounded-lg object-contain"
/>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate max-w-[120px] sm:max-w-none">
                {school?.name ?? 'School'}
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {nav.map(({ label, to, icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive(to)
                    ? 'bg-violet-100 text-violet-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* User name — desktop only */}
            <span className="hidden sm:block text-sm text-gray-500 max-w-[120px] truncate">
              {(user as any)?.full_name ?? (user as any)?.email}
            </span>

            {/* Logout — desktop */}
            <button
              onClick={handleLogout}
              className="hidden sm:block rounded-lg px-3 py-1.5 border text-sm hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>

            {/* Hamburger — mobile/tablet */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              <div className="w-5 space-y-1">
                <span className={`block h-0.5 bg-gray-700 transition-transform ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`block h-0.5 bg-gray-700 transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-gray-700 transition-transform ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="lg:hidden border-t bg-white shadow-lg">
            <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
              {/* User info */}
              <div className="flex items-center justify-between py-2 mb-2 border-b">
                <div>
                  <div className="text-sm font-medium">{(user as any)?.full_name}</div>
                  <div className="text-xs text-gray-500 capitalize">{role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Logout
                </button>
              </div>

              {/* All nav items */}
              {nav.map(({ label, to, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive(to)
                      ? 'bg-violet-100 text-violet-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg w-6 text-center">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 lg:pb-6">
        <Outlet />
      </main>

      {/* ── Bottom nav — mobile only ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {bottomNav.map(({ label, to, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[56px] ${
                isActive(to)
                  ? 'text-violet-600'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] font-medium leading-none">{label}</span>
              {isActive(to) && (
                <span className="w-1 h-1 rounded-full bg-violet-600 mt-0.5" />
              )}
            </Link>
          ))}
          {/* More button — opens hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] ${
              menuOpen ? 'text-violet-600' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">☰</span>
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}