import { useEffect, useState, type FormEvent } from 'react'
import { getCurrentUserId } from '../lib/auth'
import {
  createStockExpiredHistory,
  createStockItem,
  deleteStockItem,
  fetchStockExpiredHistory,
  fetchStockItems,
  getStockExpirationState,
  updateStockItem,
} from '../lib/stock'
import { createNotificationIfNotExists } from '../lib/notifications'
import { fetchUsersByRoles } from '../lib/profiles'
import { createActivityLog } from '../lib/activity'
import type { StockExpiredHistoryItem, StockItem } from '../types/domain'

const categoryOptions = ['Makanan', 'Minuman', 'Kemasan', 'Bahan Baku', 'Perlengkapan'] as const
const unitOptions = ['kg', 'gram', 'liter', 'ml', 'pcs', 'box', 'lusin'] as const

type StockCategory = typeof categoryOptions[number]
type StockUnit = typeof unitOptions[number]

type StockStatus = 'available' | 'unavailable'

const statusOptions = [
  { value: 'available', label: 'Tersedia' },
  { value: 'unavailable', label: 'Tidak Tersedia' },
] as const

const badgeClasses = (variant: 'slate' | 'emerald' | 'amber' | 'orange' | 'rose') => {
  switch (variant) {
    case 'emerald':
      return 'bg-emerald-100 text-emerald-800'
    case 'amber':
      return 'bg-amber-100 text-amber-800'
    case 'orange':
      return 'bg-orange-100 text-orange-800'
    case 'rose':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const StockManager = () => {
  const [items, setItems] = useState<StockItem[]>([])
  const [history, setHistory] = useState<StockExpiredHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<StockCategory>(categoryOptions[0])
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<StockUnit>(unitOptions[0])
  const [minimumStock, setMinimumStock] = useState('')
  const [expiredAt, setExpiredAt] = useState('')
  const [status, setStatus] = useState<StockStatus>(statusOptions[0].value)

  const notifyStockAlerts = async (stockItems: StockItem[]) => {
    const receivers = await fetchUsersByRoles(['owner', 'manager'])
    if (receivers.length === 0) {
      return
    }

    const currentUserId = await getCurrentUserId()
    const senderId = currentUserId ?? null

    await Promise.all(
      stockItems.map(async (item) => {
        const expirationState = getStockExpirationState(item.expired_at)

        if (item.quantity <= item.minimum_stock) {
          await Promise.all(
            receivers.map((receiverId) =>
              createNotificationIfNotExists({
                receiver_id: receiverId,
                sender_id: senderId,
                type: 'stock_low',
                reference_id: `stock_low:${item.id}`,
                title: `Stok rendah: ${item.name}`,
                message: `Jumlah ${item.quantity} ${item.unit} berada di atau di bawah batas minimum ${item.minimum_stock}.`, 
                is_read: false,
              })
            )
          )
        }

        if (expirationState.state === 'h-7') {
          await Promise.all(
            receivers.map((receiverId) =>
              createNotificationIfNotExists({
                receiver_id: receiverId,
                sender_id: senderId,
                type: 'stock_expiring_h7',
                reference_id: `stock_expiring_h7:${item.id}`,
                title: `Barang hampir expired: ${item.name}`,
                message: `Tanggal expired ${item.expired_at} - perhatikan stok ini segera.`,
                is_read: false,
              })
            )
          )
        }

        if (expirationState.state === 'h-3' || expirationState.state === 'expired') {
          await Promise.all(
            receivers.map((receiverId) =>
              createNotificationIfNotExists({
                receiver_id: receiverId,
                sender_id: senderId,
                type: 'stock_expiring_h3',
                reference_id: `stock_expiring_h3:${item.id}`,
                title: `Barang kritis: ${item.name}`,
                message: `Stok akan expired ${item.expired_at} atau sudah expired. Segera cek dan tindak lanjut.`,
                is_read: false,
              })
            )
          )
        }
      })
    )
  }

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStockItems()
      setItems(data)
      void notifyStockAlerts(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const data = await fetchStockExpiredHistory()
      setHistory(data)
    } catch (err) {
      setHistoryError((err as Error).message)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
    void loadHistory()
  }, [])

  const resetForm = () => {
    setSelectedItem(null)
    setName('')
    setCategory(categoryOptions[0])
    setQuantity('')
    setUnit(unitOptions[0])
    setMinimumStock('')
    setExpiredAt('')
    setStatus(statusOptions[0].value)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nama barang diperlukan.')
      return
    }
    if (!quantity || Number(quantity) < 0) {
      setError('Jumlah stok harus bernilai 0 atau lebih.')
      return
    }
    if (!minimumStock || Number(minimumStock) < 0) {
      setError('Minimal stok harus bernilai 0 atau lebih.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        category,
        quantity: Number(quantity),
        unit,
        minimum_stock: Number(minimumStock),
        expired_at: expiredAt || null,
        status,
      }

      const currentUserId = await getCurrentUserId()
      if (!currentUserId) {
        throw new Error('Pengguna tidak ditemukan. Silakan login ulang.')
      }

      if (selectedItem) {
        const updatedItem = await updateStockItem(selectedItem.id, payload)
        await createActivityLog({
          user_id: currentUserId,
          user_role: null,
          action: 'update_stock',
          target_type: 'stock',
          target_id: updatedItem.id,
          description: `Memperbarui stok ${updatedItem.name}.`,
        })
      } else {
        const newItem = await createStockItem(payload)
        await createActivityLog({
          user_id: currentUserId,
          user_role: null,
          action: 'create_stock',
          target_type: 'stock',
          target_id: newItem.id,
          description: `Menambahkan item stok ${newItem.name}.`,
        })
      }

      await loadItems()
      resetForm()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: StockItem) => {
    setSelectedItem(item)
    setName(item.name)
    setCategory(item.category as StockCategory)
    setQuantity(String(item.quantity))
    setUnit(item.unit as StockUnit)
    setMinimumStock(String(item.minimum_stock))
    setExpiredAt(item.expired_at ?? '')
    setStatus(item.status)
    setError(null)
  }

  const handleDelete = async (item: StockItem) => {
    const confirmed = window.confirm(`Hapus barang ${item.name}?`)
    if (!confirmed) return

    setSaving(true)
    try {
      await deleteStockItem(item.id)
      const currentUserId = await getCurrentUserId()
      if (!currentUserId) {
        throw new Error('Pengguna tidak ditemukan. Silakan login ulang.')
      }
      await createActivityLog({
        user_id: currentUserId,
        user_role: null,
        action: 'delete_stock',
        target_type: 'stock',
        target_id: item.id,
        description: `Menghapus item stok ${item.name}.`,
      })
      await loadItems()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleExpiredAction = async (item: StockItem, action: 'disposed' | 'replaced') => {
    const defaultNote = action === 'disposed' ? 'Dibuang karena expired' : 'Diganti setelah expired'
    const note = window.prompt('Catatan tindakan (opsional):', defaultNote)
    if (note === null) return

    setSaving(true)
    try {
      const currentUserId = await getCurrentUserId()
      if (!currentUserId) {
        throw new Error('Pengguna tidak ditemukan. Silakan login ulang.')
      }

      if (action === 'disposed') {
        await updateStockItem(item.id, { status: 'unavailable', quantity: 0 })
      } else {
        await updateStockItem(item.id, { status: 'available', expired_at: null })
      }

      await createStockExpiredHistory({
        stock_id: item.id,
        action,
        note: note.trim() || null,
        expired_at: item.expired_at || null,
        acted_by: currentUserId,
      })

      await createActivityLog({
        user_id: currentUserId,
        user_role: null,
        action: action === 'disposed' ? 'expired_disposed' : 'expired_replaced',
        target_type: 'stock',
        target_id: item.id,
        description: `${action === 'disposed' ? 'Membuang' : 'Mengganti'} barang expired ${item.name}.`,
      })

      await loadItems()
      await loadHistory()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const h7Items = items.filter((item) => {
    const state = getStockExpirationState(item.expired_at).state
    return state === 'h-7'
  })

  const h3Items = items.filter((item) => {
    const state = getStockExpirationState(item.expired_at).state
    return state === 'h-3'
  })

  const expiredItems = items.filter((item) => {
    const state = getStockExpirationState(item.expired_at).state
    return state === 'expired'
  })

  return (
    <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Manajemen Stok</h2>
          <p className="mt-1 text-sm text-slate-600">Atur data stok barang, peringatan minimum, dan expired.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Total barang: <span className="font-semibold">{items.length}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 grid-cols-1 xl:grid-cols-[1.6fr_1fr]">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-sm text-slate-500">H-7 Expired</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{h7Items.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-sm text-slate-500">H-3 Expired</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{h3Items.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-sm text-slate-500">Sudah Expired</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{expiredItems.length}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Barang Kritis</h3>
          <p className="mt-2 text-sm text-slate-600">Daftar item yang perlu perhatian manajer dan pemilik.</p>
          <div className="mt-4 space-y-3">
            {[...h3Items, ...expiredItems].slice(0, 5).map((item) => {
              const state = getStockExpirationState(item.expired_at)
              return (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-600">{item.category} • {item.quantity} {item.unit}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(state.variant)}`}>
                      {state.label}
                    </span>
                  </div>
                </div>
              )
            })}
            {h3Items.length + expiredItems.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada item kritis saat ini.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Form Stok</h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Barang</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Contoh: Tepung Terigu"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StockCategory)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Satuan</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as StockUnit)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {unitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Jumlah</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Minimum Stok</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tanggal Expired</label>
                <input
                  type="date"
                  value={expiredAt}
                  onChange={(e) => setExpiredAt(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StockStatus)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {selectedItem ? 'Perbarui Stok' : 'Tambah Stok'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Daftar Stok</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Nama</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Kategori</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Jumlah</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Expired</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      Memuat stok...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      Belum ada data stok.
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
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(expireState.variant)}`}>
                            {expireState.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              item.status === 'available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 space-x-2">
                          {expireState.state === 'expired' ? (
                            <>
                              <button
                                onClick={() => void handleExpiredAction(item, 'disposed')}
                                disabled={saving}
                                className="min-h-[44px] rounded-2xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200 disabled:opacity-60"
                              >
                                Tandai Dibuang
                              </button>
                              <button
                                onClick={() => void handleExpiredAction(item, 'replaced')}
                                disabled={saving}
                                className="min-h-[44px] rounded-2xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-200 disabled:opacity-60"
                              >
                                Tandai Diganti
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="min-h-[44px] rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="min-h-[44px] rounded-2xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                              >
                                Hapus
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Riwayat Barang Expired</h3>
            <p className="mt-1 text-sm text-slate-600">Catatan tindakan manager ketika barang expired dibuang atau diganti.</p>
          </div>
          <div className="text-sm text-slate-500">Terakhir diperbarui: {history.length} item</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Nama Barang</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Catatan</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Expired</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Tanggal Tindakan</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {historyLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Memuat riwayat...
                  </td>
                </tr>
              ) : historyError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-rose-600">
                    {historyError}
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Belum ada riwayat barang expired.
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-4 text-slate-900">{record.stock_name ?? 'Tidak diketahui'}</td>
                    <td className="px-4 py-4 text-slate-600">{record.action === 'disposed' ? 'Dibuang' : 'Diganti'}</td>
                    <td className="px-4 py-4 text-slate-600">{record.note ?? '-'}</td>
                    <td className="px-4 py-4 text-slate-600">{record.expired_at ?? '-'}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(record.action_date).toLocaleString()}</td>
                    <td className="px-4 py-4 text-slate-600">{record.acted_by}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default StockManager
