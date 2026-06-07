import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchStockItems, updateStockItem } from '../lib/stock'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activity'
import type { StockItem } from '../types/domain'

const StaffStockReceiptForm = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [selectedStockId, setSelectedStockId] = useState<string>('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const loadStockItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchStockItems()
      setStockItems(items)
      if (!selectedStockId && items.length > 0) {
        setSelectedStockId(items[0].id)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      const currentUser = await getCurrentUserId()
      setUserId(currentUser)
      await loadStockItems()
    })()
  }, [])

  const selectedStock = useMemo(
    () => stockItems.find((item) => item.id === selectedStockId) ?? null,
    [stockItems, selectedStockId]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!userId) {
      setError('User belum dikenali. Silakan login ulang.')
      return
    }
    if (!selectedStock || !quantity || Number(quantity) <= 0) {
      setError('Pilih barang dan masukkan jumlah yang valid.')
      return
    }

    setSaving(true)
    try {
      const nextQty = selectedStock.quantity + Number(quantity)
      await updateStockItem(selectedStock.id, { quantity: nextQty })

      await createActivityLog({
        user_id: userId,
        user_role: 'staff',
        action: 'update_stock',
        target_type: 'stock',
        target_id: selectedStock.id,
        description: `Karyawan menambahkan ${quantity} ${selectedStock.unit} ke stok ${selectedStock.name}.`,
      })

      setSuccess('Stok berhasil diperbarui.')
      setQuantity('')
      await loadStockItems()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Input Stok Masuk</h2>
      <p className="mt-2 text-sm text-slate-600">Pilih barang dan tambahkan stok masuk untuk pembukuan.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Barang</label>
          <select
            value={selectedStockId}
            onChange={(e) => setSelectedStockId(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            {stockItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.quantity} {item.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Jumlah Masuk</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <button
          type="submit"
          disabled={saving || loading}
          className="min-h-[44px] inline-flex justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Update Stok'}
        </button>
      </form>
    </section>
  )
}

export default StaffStockReceiptForm
