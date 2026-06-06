import { useEffect, useState, type FormEvent } from 'react'
import { createTransaction, deleteTransaction, fetchTransactions, updateTransaction } from '../lib/transactions'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activity'
import type { TransactionItem } from '../types/domain'

const transactionTypes = [
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'sale', label: 'Penjualan' },
  { value: 'purchase', label: 'Pembelian' },
] as const

type TransactionType = typeof transactionTypes[number]['value']

const OwnerTransactionManager = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<TransactionItem | null>(null)
  const [type, setType] = useState<TransactionType>('income')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [userId, setUserId] = useState('')

  const loadTransactions = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchTransactions()
      setTransactions(items)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      const currentUserId = await getCurrentUserId()
      if (currentUserId) setUserId(currentUserId)
      await loadTransactions()
    })()
  }, [])

  const resetForm = () => {
    setSelectedItem(null)
    setType('income')
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!amount || Number(amount) < 0) {
      setError('Jumlah harus bernilai 0 atau lebih.')
      return
    }
    if (!userId) {
      setError('User ID diperlukan untuk mencatat transaksi.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        type,
        amount: Number(amount),
        date,
        description: description.trim(),
        user_id: userId,
      }

      if (selectedItem) {
        await updateTransaction(selectedItem.id, payload)
        await createActivityLog({
          user_id: userId,
          user_role: null,
          action: 'update_transaction',
          target_type: 'transaction',
          target_id: selectedItem.id,
          description: `Memperbarui transaksi ${payload.type} sebesar Rp ${payload.amount.toLocaleString('id-ID')}.`,
        })
      } else {
        const newItem = await createTransaction(payload)
        await createActivityLog({
          user_id: userId,
          user_role: null,
          action: 'create_transaction',
          target_type: 'transaction',
          target_id: newItem.id,
          description: `Membuat transaksi ${payload.type} sebesar Rp ${payload.amount.toLocaleString('id-ID')}.`,
        })
      }

      await loadTransactions()
      resetForm()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: TransactionItem) => {
    setSelectedItem(item)
    setType(item.type)
    setAmount(String(item.amount))
    setDate(item.date)
    setDescription(item.description ?? '')
    setUserId(item.user_id)
    setError(null)
  }

  const handleDelete = async (item: TransactionItem) => {
    const confirmed = window.confirm(`Hapus transaksi ${item.type} sebesar Rp ${item.amount.toLocaleString('id-ID')}?`)
    if (!confirmed) return

    setSaving(true)
    try {
      await deleteTransaction(item.id)
      await createActivityLog({
        user_id: userId,
        user_role: null,
        action: 'delete_transaction',
        target_type: 'transaction',
        target_id: item.id,
        description: `Menghapus transaksi ${item.type} sebesar Rp ${item.amount.toLocaleString('id-ID')}.`,
      })
      await loadTransactions()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Manajemen Transaksi</h2>
          <p className="mt-1 text-sm text-slate-600">Catat pemasukan dan pengeluaran operasional.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Total transaksi: <span className="font-semibold">{transactions.length}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Form Transaksi</h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Jenis Transaksi</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {transactionTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Jumlah</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="0.00"
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

            <div>
              <label className="block text-sm font-medium text-slate-700">User ID</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Masukkan user_id Supabase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Deskripsi</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Contoh: Penjualan nasi goreng…"
              />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {selectedItem ? 'Perbarui Transaksi' : 'Tambah Transaksi'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-900">Daftar Transaksi</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Tipe</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Jumlah</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Tanggal</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">User</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Memuat transaksi...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  transactions.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 font-medium text-slate-900">{item.type}</td>
                      <td className="px-4 py-4 text-slate-600">Rp {item.amount.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4 text-slate-600">{item.date}</td>
                      <td className="px-4 py-4 text-slate-600">{item.user_id}</td>
                      <td className="px-4 py-4 space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-2xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OwnerTransactionManager
