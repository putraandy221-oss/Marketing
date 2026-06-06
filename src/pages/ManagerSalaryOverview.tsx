import { useEffect, useState } from 'react'
import { fetchSalaries } from '../lib/salaries'
import type { SalaryItem } from '../types/domain'

const ManagerSalaryOverview = () => {
  const [items, setItems] = useState<SalaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchSalaries()
        setItems(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Lihat Data Gaji</h2>
          <p className="mt-1 text-sm text-slate-600">Manager hanya bisa melihat data gaji, tanpa mengubahnya.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Total entri: <span className="font-semibold">{items.length}</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Karyawan</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Posisi</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Total</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Periode</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Jatuh Tempo</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Memuat data gaji...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Belum ada data gaji.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-medium text-slate-900">{item.employee_name}</td>
                  <td className="px-4 py-4 text-slate-600">{item.position}</td>
                  <td className="px-4 py-4 text-slate-600">Rp {item.total_salary.toLocaleString()}</td>
                  <td className="px-4 py-4 text-slate-600">{item.period_label}</td>
                  <td className="px-4 py-4 text-slate-600">{item.due_date}</td>
                  <td className="px-4 py-4 text-slate-600">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        item.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.payment_status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ManagerSalaryOverview
