import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchStockItems, updateStockItem, createStockItem, deleteStockItem } from '../lib/stock'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activity'
import type { StockItem } from '../types/domain'

type Mode = 'in' | 'out' | 'create' | 'edit'

const StaffStockReceiptForm = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [selectedStockId, setSelectedStockId] = useState<string>('')
  const [mode, setMode] = useState<Mode>('in')

  // common
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // in/out
  const [quantity, setQuantity] = useState('')

  // create/edit
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [minimumStock, setMinimumStock] = useState('0')
  const [expiredAt, setExpiredAt] = useState('')

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

  const resetForm = () => {
    setQuantity('')
    setName('')
    setCategory('')
    setUnit('pcs')
    setMinimumStock('0')
    setExpiredAt('')
    setMode('in')
    setSuccess(null)
    setError(null)
  }

  const handleInOutSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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
      const delta = mode === 'in' ? Number(quantity) : -Number(quantity)
      const nextQty = selectedStock.quantity + delta
      if (nextQty < 0) {
        throw new Error('Jumlah stok tidak boleh negatif.')
      }

      await updateStockItem(selectedStock.id, { quantity: nextQty })

      await createActivityLog({
        user_id: userId,
        user_role: 'staff',
        action: 'update_stock',
        target_type: 'stock',
        target_id: selectedStock.id,
        description:
          mode === 'in'
            ? `Karyawan menambahkan ${quantity} ${selectedStock.unit} ke stok ${selectedStock.name}.`
            : `Karyawan mengurangi ${quantity} ${selectedStock.unit} dari stok ${selectedStock.name}.`,
      })

      setSuccess('Perubahan stok berhasil disimpan.')
      resetForm()
      await loadStockItems()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!userId) {
      setError('User belum dikenali. Silakan login ulang.')
      return
    }
    if (!name.trim()) {
      setError('Nama barang diperlukan.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        category: category || 'Umum',
        quantity: Number(quantity) || 0,
        unit: unit || 'pcs',
        minimum_stock: Number(minimumStock) || 0,
        expired_at: expiredAt || null,
        status: 'available' as const,
      }

      const newItem = await createStockItem(payload)

      await createActivityLog({
        user_id: userId,
        user_role: 'staff',
        action: 'create_stock',
        target_type: 'stock',
        target_id: newItem.id,
        description: `Menambahkan item stok ${newItem.name}.`,
      })

      setSuccess('Item stok berhasil dibuat.')
      resetForm()
      await loadStockItems()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!userId || !selectedStock) return
    setError(null)
    setSaving(true)
    try {
      const payload: any = {
        name: name.trim() || selectedStock.name,
        category: category || selectedStock.category,
        unit: unit || selectedStock.unit,
        minimum_stock: Number(minimumStock) || selectedStock.minimum_stock,
        expired_at: expiredAt || selectedStock.expired_at,
      }

      const updated = await updateStockItem(selectedStock.id, payload)
      await createActivityLog({
        user_id: userId,
        user_role: 'staff',
        action: 'update_stock',
        target_type: 'stock',
        target_id: updated.id,
        description: `Memperbarui data stok ${updated.name}.`,
      })

      setSuccess('Item stok berhasil diperbarui.')
      resetForm()
      await loadStockItems()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedStock) return
    const confirmed = window.confirm(`Hapus barang ${selectedStock.name}?`)
    if (!confirmed) return
    setSaving(true)
    try {
      await deleteStockItem(selectedStock.id)
      if (userId) {
        await createActivityLog({
          user_id: userId,
          user_role: 'staff',
          action: 'delete_stock',
          target_type: 'stock',
          target_id: selectedStock.id,
          description: `Menghapus item stok ${selectedStock.name}.`,
        })
      }
      setSuccess('Item stok berhasil dihapus.')
      resetForm()
      await loadStockItems()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Manajemen & Input Stok (Karyawan)</h2>
      <p className="mt-2 text-sm text-slate-600">Tambah, edit, hapus, dan input stok masuk/keluar.</p>

      <div className="mt-4 flex gap-2">
        <button onClick={() => setMode('in')} className={`px-3 py-2 rounded-2xl ${mode === 'in' ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>Stok Masuk</button>
        <button onClick={() => setMode('out')} className={`px-3 py-2 rounded-2xl ${mode === 'out' ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>Stok Keluar</button>
        <button onClick={() => setMode('create')} className={`px-3 py-2 rounded-2xl ${mode === 'create' ? 'bg-amber-500 text-white' : 'bg-slate-100'}`}>Tambah Barang</button>
        <button onClick={() => setMode('edit')} className={`px-3 py-2 rounded-2xl ${mode === 'edit' ? 'bg-amber-500 text-white' : 'bg-slate-100'}`}>Edit / Hapus</button>
      </div>

      <div className="mt-6">
        {(mode === 'in' || mode === 'out') && (
          <form onSubmit={handleInOutSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Barang</label>
              <select value={selectedStockId} onChange={(e) => setSelectedStockId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Jumlah</label>
              <input type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

            <div className="flex justify-end">
              <button type="submit" disabled={saving || loading} className="min-h-[44px] rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">
                {saving ? 'Menyimpan...' : mode === 'in' ? 'Catat Masuk' : 'Catat Keluar'}
              </button>
            </div>
          </form>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Barang</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Kategori</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Satuan</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Jumlah Awal</label>
                <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Minimum Stok</label>
                <input type="number" min="0" step="1" value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal Expired (opsional)</label>
              <input type="date" value={expiredAt} onChange={(e) => setExpiredAt(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="min-h-[44px] rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white">
                {saving ? 'Menyimpan...' : 'Tambah Barang'}
              </button>
            </div>
          </form>
        )}

        {mode === 'edit' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Pilih Barang</label>
              <select value={selectedStockId} onChange={(e) => setSelectedStockId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
                ))}
              </select>
            </div>

            {selectedStock && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nama</label>
                  <input value={name || selectedStock.name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Kategori</label>
                    <input value={category || selectedStock.category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Satuan</label>
                    <input value={unit || selectedStock.unit} onChange={(e) => setUnit(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Minimum Stok</label>
                    <input type="number" min="0" step="1" value={minimumStock || String(selectedStock.minimum_stock)} onChange={(e) => setMinimumStock(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Tanggal Expired</label>
                    <input type="date" value={expiredAt || (selectedStock.expired_at ?? '')} onChange={(e) => setExpiredAt(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3" />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button type="button" onClick={handleDelete} className="min-h-[44px] rounded-2xl bg-rose-100 px-5 py-3 text-sm font-semibold text-rose-700">Hapus Barang</button>
                  <button type="submit" disabled={saving} className="min-h-[44px] rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white">{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default StaffStockReceiptForm
