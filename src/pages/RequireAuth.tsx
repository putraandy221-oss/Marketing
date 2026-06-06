import { Navigate } from 'react-router-dom'
import type { UserRole } from '../types/auth'

interface RequireAuthProps {
  allowedRoles: UserRole[]
  currentRole: UserRole | null
  loading: boolean
  children: JSX.Element
}

const RequireAuth = ({ allowedRoles, currentRole, loading, children }: RequireAuthProps) => {
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">Memuat...</div>
      </div>
    )
  }

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default RequireAuth
