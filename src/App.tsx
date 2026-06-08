import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { getCurrentUserRole, signOut } from './lib/auth'
import LoginPage from './pages/LoginPage'
import OwnerDashboard from './pages/OwnerDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import StaffDashboard from './pages/StaffDashboard'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import NotificationSettingsPage from './pages/NotificationSettingsPage'
import RequireAuth from './pages/RequireAuth'
import SidebarLayout from './components/SidebarLayout'
import NotFoundPage from './pages/NotFoundPage'
import type { UserRole } from './types/auth'

const AUTO_LOGOUT_MS = 30 * 60 * 1000

const App = () => {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const inactivityTimer = useRef<number | null>(null)

  const loadCurrentUser = async () => {
    const currentRole = await getCurrentUserRole()
    setRole(currentRole)
    setLoading(false)
  }

  useEffect(() => {
    void loadCurrentUser()
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
    setRole(null)
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimer.current) {
        window.clearTimeout(inactivityTimer.current)
      }
      inactivityTimer.current = window.setTimeout(() => {
        void handleLogout()
      }, AUTO_LOGOUT_MS)
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const

    if (role) {
      events.forEach((eventName) => window.addEventListener(eventName, resetTimer))
      resetTimer()
    }

    return () => {
      if (inactivityTimer.current) {
        window.clearTimeout(inactivityTimer.current)
      }
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer))
    }
  }, [handleLogout, role])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50 text-slate-900">
        <div className="rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-orange-100">Memuat aplikasi...</div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={role ? <Navigate to={`/dashboard/${role}`} replace /> : <LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/notification-settings"
          element={
            <RequireAuth allowedRoles={['owner', 'manager', 'staff']} currentRole={role} loading={loading}>
              {role ? (
                <SidebarLayout role={role} onLogout={handleLogout}>
                  <NotificationSettingsPage />
                </SidebarLayout>
              ) : (
                <NotificationSettingsPage />
              )}
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/owner"
          element={
            <RequireAuth allowedRoles={['owner']} currentRole={role} loading={loading}>
              <SidebarLayout role="owner" onLogout={handleLogout}>
                <OwnerDashboard onLogout={handleLogout} />
              </SidebarLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/manager"
          element={
            <RequireAuth allowedRoles={['manager']} currentRole={role} loading={loading}>
              <SidebarLayout role="manager" onLogout={handleLogout}>
                <ManagerDashboard onLogout={handleLogout} />
              </SidebarLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/staff"
          element={
            <RequireAuth allowedRoles={['staff']} currentRole={role} loading={loading}>
              <SidebarLayout role="staff" onLogout={handleLogout}>
                <StaffDashboard onLogout={handleLogout} />
              </SidebarLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/owner"
          element={
            <RequireAuth allowedRoles={['owner']} currentRole={role} loading={loading}>
              <SidebarLayout role="owner" onLogout={handleLogout}>
                <OwnerDashboard onLogout={handleLogout} />
              </SidebarLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/manager"
          element={
            <RequireAuth allowedRoles={['manager']} currentRole={role} loading={loading}>
              <SidebarLayout role="manager" onLogout={handleLogout}>
                <ManagerDashboard onLogout={handleLogout} />
              </SidebarLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/staff"
          element={
            <RequireAuth allowedRoles={['staff']} currentRole={role} loading={loading}>
              <SidebarLayout role="staff" onLogout={handleLogout}>
                <StaffDashboard onLogout={handleLogout} />
              </SidebarLayout>
            </RequireAuth>
          }
        />
        <Route path="/" element={role ? <Navigate to={`/dashboard/${role}`} replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App
