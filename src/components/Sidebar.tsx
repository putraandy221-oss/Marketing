import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { UserRole } from '../types/auth'

interface NavItem {
  label: string
  href: string
  icon: string
}

const ownerNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/owner', icon: '🏠' },
  { label: 'Laporan', href: '#laporan', icon: '📊' },
  { label: 'Gaji & Pengeluaran', href: '#gaji', icon: '💵' },
  { label: 'Stok Ringkas', href: '#stok', icon: '📦' },
  { label: 'Manajemen Menu', href: '#kelola-akun', icon: '🍴' },
  { label: 'Notifikasi', href: '/notification-settings', icon: '🔔' },
]

const managerNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: '🏠' },
  { label: 'Pemasukan', href: '#transaksi', icon: '💰' },
  { label: 'Pengeluaran', href: '#transaksi', icon: '🧾' },
  { label: 'Gaji Karyawan', href: '#gaji', icon: '💵' },
  { label: 'Stok Barang', href: '#stok', icon: '📦' },
  { label: 'Masa Expired', href: '#expired', icon: '⚠️' },
  { label: 'Laporan Lengkap', href: '#laporan', icon: '📊' },
  { label: 'Notifikasi', href: '/notification-settings', icon: '🔔' },
]

const staffNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/staff', icon: '🏠' },
  { label: 'Input Pemasukan', href: '#transaksi', icon: '💰' },
  { label: 'Input Pengeluaran', href: '#transaksi', icon: '🧾' },
  { label: 'Update Stok', href: '#stok', icon: '📦' },
  { label: 'Cek Expired', href: '#lihat-stok', icon: '⚠️' },
  { label: 'Masukan ke Pemilik', href: '#masukan', icon: '💬' },
  { label: 'Notifikasi', href: '/notification-settings', icon: '🔔' },
]

const navByRole: Record<UserRole, NavItem[]> = {
  owner: ownerNav,
  manager: managerNav,
  staff: staffNav,
}

const roleLabel: Record<UserRole, string> = {
  owner: 'Pemilik',
  manager: 'Manager',
  staff: 'Karyawan',
}

interface SidebarProps {
  role: UserRole
  onLogout: () => void
}

const Sidebar = ({ role, onLogout }: SidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = navByRole[role]

  const scrollToHash = (hash: string) => {
    const el = document.querySelector(hash)
    if (!el) return false
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }

  const scrollToHashAfterRender = (hash: string) => {
    const start = performance.now()
    const maxDuration = 1200

    const tryScroll = () => {
      if (scrollToHash(hash)) return
      if (performance.now() - start < maxDuration) {
        requestAnimationFrame(tryScroll)
      }
    }

    requestAnimationFrame(tryScroll)
  }

  const handleNav = (href: string) => {
    setMobileOpen(false)
    if (href.startsWith('#')) {
      const dashboardPath = `/dashboard/${role}`
      if (location.pathname !== dashboardPath) {
        navigate(dashboardPath)
        scrollToHashAfterRender(href)
      } else {
        scrollToHash(href)
      }
    } else {
      navigate(href)
    }
  }

  const isActive = (href: string) => {
    if (href.startsWith('#')) return false
    return location.pathname === href
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 border-b border-slate-200 px-4 py-5 dark:border-slate-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-lg shadow-md">
          🍽️
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">Sistem FnB</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel[role]}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => handleNav(item.href)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all
                  ${isActive(item.href)
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30 ${collapsed ? 'justify-center' : ''}`}
        >
          <span className="text-base leading-none">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 transition-all duration-200 relative ${collapsed ? 'w-16' : 'w-56'}`}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition shadow"
        >
          <span className="text-xs text-slate-500">{collapsed ? '›' : '‹'}</span>
        </button>
        <SidebarContent />
      </aside>

      <div className="lg:hidden flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
        >
          <span className="text-slate-600 dark:text-slate-300">☰</span>
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-sm shadow">
          🍽️
        </div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Sistem FnB</p>
        <span className="ml-auto text-xs text-slate-500">{roleLabel[role]}</span>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex w-64 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Menu</p>
              <button type="button" onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
