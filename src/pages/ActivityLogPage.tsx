import { useEffect, useState, type FormEvent } from 'react'
import { fetchActivityLog, getActivityLogStats } from '../lib/activityLog'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activityLog'
import type { ActivityLogItem } from '../types/domain'

const ActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [filterAction, setFilterAction] = useState<string>('all')
  const [stats, setStats] = useState<{
    totalActions: number
    uniqueUsers: number
    actionsToday: number
    lastUpdate: string
  } | null>(null)

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: { startDate?: string; endDate?: string; action?: string } = {
        startDate,
        endDate,
      }
      if (filterAction !== 'all') {
        filters.action = filterAction
      }
      const data = await fetchActivityLog(filters)
      setLogs(data)

      const statsData = await getActivityLogStats()
      setStats(statsData)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadLogs()
  }

  const actionOptions = [
    { value: 'all', label: 'Semua Aksi' },
    { value: 'login', label: 'Login' },
    { value: 'create_transaction', label: 'Buat Transaksi' },
    { value: 'update_transaction', label: 'Edit Transaksi' },
    { value: 'delete_transaction', label: 'Hapus Transaksi' },
    { value: 'create_stock', label: 'Buat Stok' },
    { value: 'update_stock', label: 'Edit Stok' },
    { value: 'delete_stock', label: 'Hapus Stok' },
    { value: 'send_feedback', label: 'Kirim Feedback' },
    { value: 'respond_feedback', label: 'Balas Feedback' },
    { value: 'export_report', label: 'Export Laporan' },
  ]

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('id-ID')
  }

  return (
    <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Log Aktivitas</h2>
          <p className="mt-1 text-sm text-slate-600">Catat semua aksi pengguna di sistem. Tidak dapat dihapus.</p>
        </div>

        {stats && (
          <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Total Aksi</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.totalActions}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Pengguna Unik</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.uniqueUsers}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Aksi Hari Ini</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.actionsToday}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Pembaruan Terakhir</p>
              <p className="mt-3 text-xs font-semibold text-slate-900">{new Date(stats.lastUpdate).toLocaleTimeString('id-ID')}</p>
            </div>
          </div>
        )}

        <form className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr]" onSubmit={handleFilterSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Jenis Aksi</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        <button
          type="submit"
          className="mt-4 min-h-[44px] rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Tampilkan Log
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Pengguna</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Peran</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Deskripsi</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Memuat log...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Tidak ada log aktivitas.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-4 font-medium text-slate-900">{log.user_id}</td>
                  <td className="px-4 py-4 text-slate-700">{log.user_role ?? '-'}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{log.description}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(log.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ActivityLog
