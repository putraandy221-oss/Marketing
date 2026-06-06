import { useEffect, useState, type FormEvent } from 'react'
import { createTransaction } from '../lib/transactions'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activity'

const transactionTypes = [
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'sale', label: 'Penjualan' },
  { value: 'purchase', label: 'Pembelian' },
] as const

type TransactionType = typeof transactionTypes[number]['value']

const StaffTransactionInput = () => {
  const [type, setType] = useState<TransactionType>('income')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const currentUser = await getCurrentUserId()
      setUserId(currentUser)
    })()
  }, [])

  const resetForm = () => {
    setType('income')
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!userId) {
      setError('User belum dikenali. Silakan login ulang.')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError('Jumlah harus lebih dari 0.')
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

      await createTransaction(payload)

      await createActivityLog({
        user_id: userId,
        user_role: 'staff',
        action: 'create_transaction',
        target_type: 'transaction',
        target_id: null,
        description: `Karyawan mencatat transaksi ${type} sebesar Rp ${payload.amount.toLocaleString('id-ID')}.`,
      })

      setSuccess('Transaksi berhasil dikirim.')
      resetForm()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <h2 className="text-2xl font-semibold text-slate-900">Input Keuangan Cepat</h2>
      <p className="mt-2 text-sm text-slate-600">Catat pemasukan atau pengeluaran harian dengan cepat.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          <label className="block text-sm font-medium text-slate-700">Keterangan</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Contoh: Penjualan jus mangga..."
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </form>
    </section>
  )
}

export default StaffTransactionInput
