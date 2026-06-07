import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStockItems, getStockExpirationState } from '../lib/stock'
import { fetchTransactions } from '../lib/transactions'
import { fetchSalaries } from '../lib/salaries'
import StockManager from './StockManager'
import ManagerSalaryOverview from './ManagerSalaryOverview'
import ReportManager from './ReportManager'
import NotificationBell from './NotificationBell'
import ThemeToggle from '../components/ThemeToggle'
import type { StockItem, TransactionItem, SalaryItem } from '../types/domain'

interface ManagerDashboardProps {
  onLogout: () => void
}

const ManagerDashboard = ({ onLogout }: ManagerDashboardProps) => {
  const navigate = useNavigate()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [salaries, setSalaries] = useState<SalaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      setError(null)
      try {
        const [stockData, transactionData, salaryData] = await Promise.all([
          fetchStockItems(),
          fetchTransactions(),
          fetchSalaries(),
        ])
        setStockItems(stockData)
        setTransactions(transactionData)
        setSalaries(salaryData)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const todayTransactions = useMemo(
    () => transactions.filter((item) => item.date === today),
    [transactions, today]
  )

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

  const totalIncomeToday = useMemo(
    () =>
      todayTransactions
        .filter((item) => item.type === 'income' || item.type === 'sale')
        .reduce((sum, item) => sum + item.amount, 0),
    [todayTransactions]
  )
  const totalExpenseToday = useMemo(
    () =>
      todayTransactions
        .filter((item) => item.type === 'expense' || item.type === 'purchase')
        .reduce((sum, item) => sum + item.amount, 0),
    [todayTransactions]
  )

  const unpaidSalaryCount = salaries.filter((item) => item.payment_status === 'unpaid').length

  const netProfitToday = useMemo(() => {
    const salaryDueToday = salaries
      .filter((item) => item.due_date === today)
      .reduce((sum, item) => sum + item.total_salary, 0)

    return totalIncomeToday - totalExpenseToday - salaryDueToday
  }, [salaries, totalIncomeToday, totalExpenseToday, today])

  const last7Days = useMemo(() => {
    const days: string[] = []
    const todayDate = new Date()
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(todayDate)
      day.setDate(todayDate.getDate() - i)
      days.push(day.toISOString().slice(0, 10))
    }
    return days
  }, [])

  const lastWeekSummary = useMemo(() => {
    const summary = last7Days.map((date) => {
      const dayTransactions = transactions.filter((item) => item.date === date)
      const income = dayTransactions
        .filter((item) => item.type === 'income' || item.type === 'sale')
        .reduce((sum, item) => sum + item.amount, 0)
      const expense = dayTransactions
        .filter((item) => item.type === 'expense' || item.type === 'purchase')
        .reduce((sum, item) => sum + item.amount, 0)
      return { date, income, expense }
    })
    return summary
  }, [transactions, last7Days])

  const chartMax = Math.max(1, ...lastWeekSummary.flatMap((item) => [item.income, item.expense]))

  const criticalStocks = useMemo(
    () =>
      stockItems
        .filter((item) => item.quantity <= item.minimum_stock || ['h-7', 'h-3', 'expired'].includes(getStockExpirationState(item.expired_at).state))
        .slice(0, 5),
    [stockItems]
  )

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [transactions]
  )

  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`

  return (
    <div className="w-full space-y-6">
      <section className="w-full overflow-hidden rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
        <div className="rounded-3xl bg-gradient-to-r from-orange-500 via-amber-400 to-orange-300 p-4 sm:p-6 text-white shadow-xl ring-1 ring-orange-200">
          <div className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white">Dashboard Manager</h1>
              <p className="mt-2 text-orange-100">Alat operasional untuk memantau stok dan laporan.</p>
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

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Jumlah Item Stok</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{stockItems.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Stok Rendah</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{lowStockCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Stok Hampir Expired</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{expiringStockCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Transaksi Hari Ini</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{todayTransactions.length}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Pemasukan Hari Ini</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(totalIncomeToday)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Pengeluaran Hari Ini</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(totalExpenseToday)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Laba Bersih Hari Ini</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(netProfitToday)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Gaji Belum Dibayar</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{unpaidSalaryCount}</p>
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

      <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Grafik Pemasukan & Pengeluaran</h2>
            <p className="mt-1 text-sm text-slate-600">Ringkasan 7 hari terakhir untuk membantu pengambilan keputusan.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <div className="flex items-end gap-3 h-48">
              {lastWeekSummary.map((item) => (
                <div key={item.date} className="flex-1 text-center">
                  <div className="mb-2 h-36 w-full rounded-3xl bg-slate-200">
                    <div
                      className="h-full rounded-3xl bg-emerald-500 transition-all"
                      style={{ height: `${Math.round((item.income / chartMax) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{new Date(item.date).toLocaleDateString('id-ID', { weekday: 'short' })}</p>
                  <p className="text-xs text-emerald-700">{item.income ? `Rp ${item.income.toLocaleString('id-ID')}` : '-'}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Batang hijau = pemasukan.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-end gap-3 h-48">
              {lastWeekSummary.map((item) => (
                <div key={item.date} className="flex-1 text-center">
                  <div className="mb-2 h-36 w-full rounded-3xl bg-slate-200">
                    <div
                      className="h-full rounded-3xl bg-rose-500 transition-all"
                      style={{ height: `${Math.round((item.expense / chartMax) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{new Date(item.date).toLocaleDateString('id-ID', { weekday: 'short' })}</p>
                  <p className="text-xs text-rose-700">{item.expense ? `Rp ${item.expense.toLocaleString('id-ID')}` : '-'}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Batang merah = pengeluaran.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Stok Kritis</h2>
            <p className="mt-1 text-sm text-slate-600">Daftar barang yang perlu ditangani segera.</p>
            <div className="mt-4 space-y-3">
              {criticalStocks.length === 0 ? (
                <p className="text-sm text-slate-500">Tidak ada stok kritis hari ini.</p>
              ) : (
                criticalStocks.map((item) => {
                  const state = getStockExpirationState(item.expired_at)
                  return (
                    <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500">{item.quantity} {item.unit} • {item.category}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          state.variant === 'orange'
                            ? 'bg-orange-100 text-orange-800'
                            : state.variant === 'rose'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {state.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Transaksi Terbaru</h2>
            <p className="mt-1 text-sm text-slate-600">Lihat input transaksi terbaru untuk verifikasi cepat.</p>
            <div className="mt-4 space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada transaksi terbaru.</p>
              ) : (
                recentTransactions.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold text-slate-900">{item.type}</p>
                        <p className="text-sm text-slate-500">{item.date}</p>
                      </div>
                      <p className="text-slate-700">Rp {item.amount.toLocaleString('id-ID')}</p>
                      {item.description ? <p className="text-sm text-slate-500">{item.description}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <StockManager />
      <ReportManager />
      <ManagerSalaryOverview />
    </div>
  )
}

export default ManagerDashboard
