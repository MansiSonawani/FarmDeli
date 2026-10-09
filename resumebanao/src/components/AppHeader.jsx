import { Link, NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import Logo from './Logo'
import { Button } from './ui'
import { useAuth } from '../hooks/useAuth'
import { cx } from '../lib/cx'
import { isLocalMode } from '../lib/api'

const NAV = [
  ['/app', 'Resumes'],
  ['/app/jobs', 'Jobs'],
]

// Header for signed-in pages: logo, section tabs, account.
export default function AppHeader() {
  const { user, signOut } = useAuth()
  return (
    <header className="border-b border-line px-5 sm:px-8">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 sm:gap-10">
        <Link to="/" aria-label="resumebanao home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="App" className="flex h-full gap-1">
          {NAV.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              className={({ isActive }) =>
                cx(
                  'flex items-center px-3 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-ink shadow-[inset_0_-2px_0_var(--color-ink)]'
                    : 'text-muted hover:text-ink',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="eyebrow hidden md:inline">{isLocalMode ? 'Demo mode' : user?.email}</span>
          {!isLocalMode && (
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
