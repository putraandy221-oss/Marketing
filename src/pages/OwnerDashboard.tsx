import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTransactions } from '../lib/transactions'
import { fetchSalaries } from '../lib/salaries'
import { fetchStockItems, getStockExpirationState } from '../lib/stock'
import { fetchOwnerFeedback } from '../lib/feedback'
import { getCurrentUserId } from '../lib/auth'
import { fetchBackupData } from '../lib/backup'
import OwnerMenuManager from './OwnerMenuManager'
import OwnerTransactionManager from './OwnerTransactionManager'
import OwnerSalaryManager from './OwnerSalaryManager'
import ReportManager from './ReportManager'
import StockManager from './StockManager'
import FeedbackManagerOwner from './FeedbackManagerOwner'
import ActivityLog from './ActivityLog'
import NotificationBell from './NotificationBell'
import ThemeToggle from '../components/ThemeToggle'
import type { FeedbackItem, SalaryItem, StockItem, TransactionItem } from '../types/domain'

interface OwnerDashboardProps {
  onLogout: () => void
}

const OwnerDashboard = ({ onLogout }: OwnerDashboardProps) => {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [salaries, setSalaries] = useState<SalaryItem[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)

  const getMonthRange = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth()
    const start = new Date(year, month, 1).toISOString().slice(0, 10)
    const end = new Date(year, month + 1, 0).toISOString().slice(0, 10)
    return { start, end }
  }

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const currentUserId = await getCurrentUserId()
        const [transactionData, salaryData, stockData] = await Promise.all([
          fetchTransactions(),
          fetchSalaries(),
          fetchStockItems(),
        ])

        let ownerFeedback: FeedbackItem[] = []
        if (currentUserId) {
          ownerFeedback = await fetchOwnerFeedback(currentUserId)
        }

        setTransactions(transactionData)
        setSalaries(salaryData)
        setStockItems(stockData)
        setFeedbackList(ownerFeedback)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    setAutoBackupEnabled(window.localStorage.getItem('fnb_auto_backup') === 'true')
  }, [])

  const downloadBackupData = async () => {
    setBackupMessage(null)
    setBackupLoading(true)
    try {
      const backupPackage = await fetchBackupData()
      const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `fnb-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setBackupMessage('Backup data berhasil dibuat dan diunduh.')
    } catch (err) {
      setBackupMessage(`Gagal membuat backup: ${(err as Error).message}`)
    } finally {
      setBackupLoading(false)
    }
  }

  useEffect(() => {
    if (autoBackupEnabled && !loading) {
      void downloadBackupData()
    }
  }, [autoBackupEnabled, loading])

  const toggleAutoBackup = () => {
    const nextValue = !autoBackupEnabled
    setAutoBackupEnabled(nextValue)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fnb_auto_backup', nextValue ? 'true' : 'false')
    }
    if (nextValue && !loading) {
      void downloadBackupData()
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const { start: monthStart, end: monthEnd } = useMemo(() => getMonthRange(today), [today])

  const todayTransactions = transactions.filter((item) => item.date === today)
  const monthTransactions = transactions.filter((item) => item.date >= monthStart && item.date <= monthEnd)

  const totalIncomeToday = todayTransactions
    .filter((item) => item.type === 'income' || item.type === 'sale')
    .reduce((sum, item) => sum + item.amount, 0)
  const totalExpenseToday = todayTransactions
    .filter((item) => item.type === 'expense' || item.type === 'purchase')
    .reduce((sum, item) => sum + item.amount, 0)
  const netProfitToday = totalIncomeToday - totalExpenseToday -
    salaries.filter((item) => item.due_date === today).reduce((sum, item) => sum + item.total_salary, 0)

  const totalIncomeMonth = monthTransactions
    .filter((item) => item.type === 'income' || item.type === 'sale')
    .reduce((sum, item) => sum + item.amount, 0)
  const totalExpenseMonth = monthTransactions
    .filter((item) => item.type === 'expense' || item.type === 'purchase')
    .reduce((sum, item) => sum + item.amount, 0)
  const netProfitMonth = totalIncomeMonth - totalExpenseMonth -
    salaries.filter((item) => item.due_date >= monthStart && item.due_date <= monthEnd).reduce((sum, item) => sum + item.total_salary, 0)

  const unpaidSalaries = salaries.filter((item) => item.payment_status === 'unpaid')
  const paidSalaries = salaries.filter((item) => item.payment_status === 'paid')
  const lowStockCount = stockItems.filter((item) => item.quantity <= item.minimum_stock).length
  const expiringStockCount = stockItems.filter((item) => {
    const state = getStockExpirationState(item.expired_at).state
    return state === 'h-7' || state === 'h-3' || state === 'expired'
  }).length
  const pendingFeedbackCount = feedbackList.filter((item) => item.status === 'pending').length

  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`

  return (
    <div className="w-full space-y-6">
      <section className="w-full overflow-hidden rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
        <div className="rounded-3xl bg-gradient-to-r from-orange-500 via-amber-400 to-orange-300 p-4 sm:p-6 text-white shadow-xl ring-1 ring-orange-200">
          <div className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white">Dashboard Pemilik</h1>
              <p className="mt-2 text-orange-100">Ringkasan keuangan dan kontrol penuh atas sistem.</p>
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

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Pemasukan Hari Ini</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(totalIncomeToday)}</p>
            <p className="mt-2 text-sm text-slate-500">Berdasarkan transaksi hari ini.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Pengeluaran Hari Ini</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(totalExpenseToday)}</p>
            <p className="mt-2 text-sm text-slate-500">Termasuk pembelian dan pengeluaran lain.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Laba Bersih Hari Ini</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(netProfitToday)}</p>
            <p className="mt-2 text-sm text-slate-500">Laba setelah gaji periode hari ini.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Gaji Belum Dibayar</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{unpaidSalaries.length}</p>
            <p className="mt-2 text-sm text-slate-500">Total entri belum dibayar.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Stok Kritis</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{lowStockCount + expiringStockCount}</p>
            <p className="mt-2 text-sm text-slate-500">Jumlah stok rendah atau hampir/ sudah expired.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-sm text-slate-500">Masukan Belum Dibalas</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{pendingFeedbackCount}</p>
            <p className="mt-2 text-sm text-slate-500">Lihat dan balas masukan karyawan.</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Backup Data Otomatis</p>
              <p className="mt-1 text-sm text-slate-500">Buat salinan JSON dari data aplikasi untuk restore atau arsip.</p>
            </div>
            <button
              type="button"
              onClick={toggleAutoBackup}
              className="w-full sm:w-auto rounded-2xl border px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {autoBackupEnabled ? 'Nonaktifkan Backup Otomatis' : 'Aktifkan Backup Otomatis'}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={downloadBackupData}
              disabled={backupLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {backupLoading ? 'Membuat backup...' : 'Backup Sekarang'}
            </button>
            <p className="text-sm text-slate-500">
              {backupMessage ?? 'Backup otomatis akan diunduh sebagai file JSON ketika aktivasi aktif.'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => navigate('/notification-settings')}
          className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 text-left transition hover:border-slate-300"
        >
          <p className="text-sm text-slate-500">Shortcut</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">Pengaturan Notifikasi</p>
        </button>
        <a href="#laporan" className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 text-left transition hover:border-slate-300">
          <p className="text-sm text-slate-500">Shortcut</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">Laporan</p>
        </a>
        <a href="#gaji" className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 text-left transition hover:border-slate-300">
          <p className="text-sm text-slate-500">Shortcut</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">Gaji</p>
        </a>
        <a href="#log-aktivitas" className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 text-left transition hover:border-slate-300">
          <p className="text-sm text-slate-500">Shortcut</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">Log Aktivitas</p>
        </a>
      </div>

      <div id="kelola-akun">
        <OwnerMenuManager />
      </div>
      <div id="laporan">
        <ReportManager />
      </div>
      <div id="log-aktivitas">
        <ActivityLog />
      </div>
      <div id="gaji">
        <OwnerSalaryManager />
      </div>
      <StockManager />
      <FeedbackManagerOwner />
    </div>
  )
}

export default OwnerDashboard
