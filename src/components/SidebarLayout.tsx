import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import type { UserRole } from '../types/auth'

interface SidebarLayoutProps {
  role: UserRole
  onLogout: () => void
  children: ReactNode
}

const SidebarLayout = ({ role, onLogout, children }: SidebarLayoutProps) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="hidden lg:flex flex-col shrink-0">
        <Sidebar role={role} onLogout={onLogout} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="lg:hidden">
          <Sidebar role={role} onLogout={onLogout} />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SidebarLayout
