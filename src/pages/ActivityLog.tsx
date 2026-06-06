import { useEffect, useState } from 'react'
import { fetchActivityLogs } from '../lib/activity'
import type { ActivityLogItem } from '../types/domain'

const ActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchActivityLogs()
      setLogs(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Log Aktivitas</h2>
          <p className="mt-1 text-sm text-slate-600">Semua kegiatan penting dicatat dan hanya dapat dilihat oleh pemilik.</p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Muat ulang log
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Waktu</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Pengguna</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Peran</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Target</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Deskripsi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Memuat log aktivitas...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Belum ada aktivitas tercatat.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-4 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">{log.user_id}</td>
                  <td className="px-4 py-4 text-slate-600">{log.user_role ?? '-'}</td>
                  <td className="px-4 py-4 text-slate-600">{log.action}</td>
                  <td className="px-4 py-4 text-slate-600">{log.target_type ?? '-'} {log.target_id ? `(${log.target_id})` : ''}</td>
                  <td className="px-4 py-4 text-slate-600">{log.description}</td>
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
