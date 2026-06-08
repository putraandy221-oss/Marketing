import { useEffect, useState } from 'react'
import { fetchStockItems, getStockExpirationState, checkAllStocksExpiring } from '../lib/stock'
import type { StockItem } from '../types/domain'

const StockViewer = () => {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchStockItems()
        setItems(data)
        // Check for expiring stocks
        await checkAllStocksExpiring()
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Stok Barang</h2>
      <p className="mt-2 text-sm text-slate-600">Lihat stok barang tanpa dapat mengedit atau menghapus.</p>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Nama</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Kategori</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Jumlah</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Peringatan Expired</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Memuat stok...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Belum ada barang stok.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const expireState = getStockExpirationState(item.expired_at)
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-4 text-slate-600">{item.category}</td>
                    <td className="px-4 py-4 text-slate-600">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-4 text-slate-600">{item.status}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            expireState.state === 'h-3'
                              ? 'bg-red-100 text-red-800'
                              : expireState.state === 'h-7'
                              ? 'bg-amber-100 text-amber-800'
                              : expireState.state === 'safe'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                      >
                        {expireState.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default StockViewer
