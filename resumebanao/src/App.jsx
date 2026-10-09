import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import AuthProvider from './context/AuthProvider'
import ToastProvider from './context/ToastProvider'
import ErrorBoundary from './components/ErrorBoundary'
import { FullPageSpinner } from './components/ui'
import { useAuth } from './hooks/useAuth'

// Route-level code splitting: each page downloads only when it is visited.
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Editor = lazy(() => import('./pages/Editor'))
const Jobs = lazy(() => import('./pages/Jobs'))
const PublicResume = lazy(() => import('./pages/PublicResume'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      {/* Respect the operating system's "reduce motion" setting everywhere. */}
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<FullPageSpinner />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Login />} />
                  <Route path="/r/:slug" element={<PublicResume />} />
                  <Route
                    path="/app"
                    element={
                      <RequireAuth>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/app/resume/:id"
                    element={
                      <RequireAuth>
                        <Editor />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/app/jobs/:jobId?"
                    element={
                      <RequireAuth>
                        <Jobs />
                      </RequireAuth>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
