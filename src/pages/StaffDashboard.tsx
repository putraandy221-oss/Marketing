import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStaffFeedback } from '../lib/feedback'
import { fetchStockItems, getStockExpirationState } from '../lib/stock'
import { getCurrentUserId } from '../lib/auth'
import FeedbackFormStaff from './FeedbackFormStaff'
import StockViewer from './StockViewer'
import NotificationBell from './NotificationBell'
import StaffTransactionInput from './StaffTransactionInput'
import StaffStockReceiptForm from './StaffStockReceiptForm'
import ThemeToggle from '../components/ThemeToggle'
import type { FeedbackItem, StockItem } from '../types/domain'

interface StaffDashboardProps {
  onLogout: () => void
}

const StaffDashboard = ({ onLogout }: StaffDashboardProps) => {
  const navigate = useNavigate()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true)
      setError(null)
      try {
        const currentUserId = await getCurrentUserId()
        const [stockData, feedbackData] = await Promise.all([
          fetchStockItems(),
          currentUserId ? fetchStaffFeedback(currentUserId) : Promise.resolve([]),
        ])
        setStockItems(stockData)
        setFeedbackList(feedbackData)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    void loadSummary()
  }, [])

  const lowStockCount = useMemo(
    () => stockItems.filter((item) => item.quantity <= item.minimum_stock).length,
    [stockItems]
  )
  const expiringStockCount = useMemo(
    () =>
      stockItems.filter((item) => {
        const state = getStockExpirationState(item.expired_at).state
        return state === 'h-7' || state === 'h-3' || state === 'expired'
      }).length,
    [stockItems]
  )
  const unreadResponses = useMemo(
    () => feedbackList.filter((item) => item.status === 'responded' && !item.is_read_by_staff).length,
    [feedbackList]
  )

  return (
    <div className="w-full space-y-6">
      <section className="w-full overflow-hidden rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
        <div className="rounded-3xl bg-gradient-to-r from-orange-500 via-amber-400 to-orange-300 p-4 sm:p-6 text-white shadow-xl ring-1 ring-orange-200">
          <div className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white">Dashboard Karyawan</h1>
              <p className="mt-2 text-orange-100">Sederhana, fokus input, dan komunikasi ke pemilik.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
              <button
                onClick={onLogout}
                className="min-h-[44px] rounded-2xl bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Total Barang</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{stockItems.length}</p>
            <p className="mt-2 text-sm text-slate-500">Semua stok yang bisa Anda lihat.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Stok Kritis</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{lowStockCount + expiringStockCount}</p>
            <p className="mt-2 text-sm text-slate-500">Stok rendah atau mendekati expired.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Balasan Masukan</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{unreadResponses}</p>
            <p className="mt-2 text-sm text-slate-500">Pesan balasan dari pemilik yang belum dilihat.</p>
          </div>
        </div>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate('/notification-settings')}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 text-left text-slate-900 transition hover:border-slate-300"
          >
            <p className="text-sm text-slate-500">Shortcut</p>
            <p className="mt-3 text-lg font-semibold">Pengaturan Notifikasi</p>
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </section>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-2">
        <StaffTransactionInput />
        <StaffStockReceiptForm />
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        <StockViewer />
        <FeedbackFormStaff />
      </div>
    </div>
  )
}

export default StaffDashboard
