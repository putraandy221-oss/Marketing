import { useEffect, useState, type FormEvent } from 'react'
import { createSalary, deleteSalary, fetchSalaries, markSalaryPaid, markSalaryUnpaid, updateSalary, checkAndNotifySalaryReminders } from '../lib/salaries'
import { createNotificationIfNotExists } from '../lib/notifications'
import { getCurrentUserId } from '../lib/auth'
import { fetchUsersByRoles } from '../lib/profiles'
import { createActivityLog } from '../lib/activity'
import type { SalaryItem } from '../types/domain'

const periodOptions = [
  { value: 'monthly', label: 'Bulanan' },
  { value: 'weekly', label: 'Mingguan' },
] as const

type PaymentStatus = 'paid' | 'unpaid'

type PeriodOption = typeof periodOptions[number]['value']

const OwnerSalaryManager = () => {
  const [items, setItems] = useState<SalaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<SalaryItem | null>(null)
  const [employeeName, setEmployeeName] = useState('')
  const [position, setPosition] = useState('')
  const [baseSalary, setBaseSalary] = useState('')
  const [allowance, setAllowance] = useState('')
  const [period, setPeriod] = useState<PeriodOption>('monthly')
  const [periodLabel, setPeriodLabel] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid')

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSalaries()
      setItems(data)
      // Check and notify for unpaid salaries
      await checkAndNotifySalaryReminders()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const resetForm = () => {
    setSelectedItem(null)
    setEmployeeName('')
    setPosition('')
    setBaseSalary('')
    setAllowance('')
    setPeriod('monthly')
    setPeriodLabel('')
    setDueDate('')
    setPaymentStatus('unpaid')
    setError(null)
  }

  const notifySalaryReminder = async (item: SalaryItem, action: 'created' | 'updated' | 'status_changed') => {
    const receivers = await fetchUsersByRoles(['owner', 'manager'])
    if (receivers.length === 0) {
      return
    }

    const senderId = await getCurrentUserId()
    const dueDate = new Date(item.due_date)
    const today = new Date()
    const isOverdue = item.payment_status === 'unpaid' && dueDate < new Date(today.toDateString())
    const title = isOverdue
      ? `Gaji terlambat: ${item.employee_name}`
      : `Gaji siap dibayar: ${item.employee_name}`
    const message = isOverdue
      ? `Gaji untuk ${item.employee_name} sudah jatuh tempo pada ${item.due_date} dan belum dibayar.`
      : `Gaji untuk ${item.employee_name} jatuh tempo pada ${item.due_date}. Segera tinjau dan bayar.`

    await Promise.all(
      receivers.map(async (receiverId) => {
        try {
          await createNotificationIfNotExists({
            receiver_id: receiverId,
            sender_id: senderId,
            type: 'salary_reminder',
            reference_id: `salary_${action}:${item.id}`,
            title,
            message,
            is_read: false,
          })
        } catch (err) {
          console.error('Failed to send salary reminder notification:', err)
        }
      })
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!employeeName.trim()) {
      setError('Nama karyawan diperlukan.')
      return
    }
    if (!position.trim()) {
      setError('Posisi diperlukan.')
      return
    }
    if (!baseSalary || Number(baseSalary) < 0) {
      setError('Gaji pokok harus bernilai 0 atau lebih.')
      return
    }
    if (!periodLabel.trim()) {
      setError('Periode gaji diperlukan.')
      return
    }
    if (!dueDate) {
      setError('Tanggal jatuh tempo diperlukan.')
      return
    }

    setSaving(true)
    try {
      const totalSalary = Number(baseSalary) + Number(allowance || 0)
      const payload = {
        employee_name: employeeName.trim(),
        position: position.trim(),
        base_salary: Number(baseSalary),
        allowance: Number(allowance || 0),
        total_salary: totalSalary,
        period,
        period_label: periodLabel.trim(),
        due_date: dueDate,
        payment_status: paymentStatus,
      }

      const currentUserId = await getCurrentUserId()
      if (!currentUserId) {
        throw new Error('Pengguna tidak ditemukan. Silakan login ulang.')
      }

      if (selectedItem) {
        const updatedItem = await updateSalary(selectedItem.id, payload)
        await createActivityLog({
          user_id: currentUserId,
          user_role: null,
          action: 'update_salary',
          target_type: 'salary',
          target_id: selectedItem.id,
          description: `Memperbarui data gaji ${payload.employee_name}.`,
        })
        await notifySalaryReminder(updatedItem, 'updated')
      } else {
        const newItem = await createSalary(payload)
        await createActivityLog({
          user_id: currentUserId,
          user_role: null,
          action: 'create_salary',
          target_type: 'salary',
          target_id: newItem.id,
          description: `Menambahkan data gaji untuk ${payload.employee_name}.`,
        })
        await notifySalaryReminder(newItem, 'created')
      }

      await loadItems()
      resetForm()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: SalaryItem) => {
    setSelectedItem(item)
    setEmployeeName(item.employee_name)
    setPosition(item.position)
    setBaseSalary(String(item.base_salary))
    setAllowance(String(item.allowance))
    setPeriod(item.period)
    setPeriodLabel(item.period_label)
    setDueDate(item.due_date)
    setPaymentStatus(item.payment_status)
    setError(null)
  }

  const handleDelete = async (item: SalaryItem) => {
    const confirmed = window.confirm(`Hapus data gaji untuk ${item.employee_name}?`)
    if (!confirmed) return

    setSaving(true)
    try {
      await deleteSalary(item.id)
      const currentUserId = await getCurrentUserId()
      if (!currentUserId) {
        throw new Error('Pengguna tidak ditemukan. Silakan login ulang.')
      }
      await createActivityLog({
        user_id: currentUserId,
        user_role: null,
        action: 'delete_salary',
        target_type: 'salary',
        target_id: item.id,
        description: `Menghapus data gaji ${item.employee_name}.`,
      })
      await loadItems()
      resetForm()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const togglePaid = async (item: SalaryItem) => {
    setSaving(true)
    try {
      let updatedItem: SalaryItem
      if (item.payment_status === 'paid') {
        updatedItem = await markSalaryUnpaid(item.id)
      } else {
        updatedItem = await markSalaryPaid(item.id)
      }
      const currentUserId = await getCurrentUserId()
      if (!currentUserId) {
        throw new Error('Pengguna tidak ditemukan. Silakan login ulang.')
      }
      await createActivityLog({
        user_id: currentUserId,
        user_role: null,
        action: item.payment_status === 'paid' ? 'mark_salary_unpaid' : 'mark_salary_paid',
        target_type: 'salary',
        target_id: item.id,
        description: `Mengubah status pembayaran gaji ${item.employee_name} menjadi ${updatedItem.payment_status}.`,
      })
      await notifySalaryReminder(updatedItem, 'status_changed')
      await loadItems()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Modul Gaji Karyawan</h2>
          <p className="mt-1 text-sm text-slate-600">Pemilik bisa membuat, mengubah, dan menandai status bayar gaji.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Total entri gaji: <span className="font-semibold">{items.length}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Form Data Gaji</h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Karyawan</label>
              <input
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Contoh: Ahmad" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Posisi</label>
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Contoh: Supervisor"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Gaji Pokok</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tunjangan</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Periode</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Label Periode</label>
                <input
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Contoh: September 2026"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Status Pembayaran</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="unpaid">Belum Dibayar</option>
                  <option value="paid">Sudah Dibayar</option>
                </select>
              </div>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto min-h-[44px] inline-flex justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {selectedItem ? 'Perbarui Gaji' : 'Tambah Gaji'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto min-h-[44px] inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 overflow-x-auto">
          <h3 className="text-lg font-semibold text-slate-900">Daftar Gaji</h3>
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm mt-4">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Karyawan</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Posisi</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Total</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Periode</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Jatuh Tempo</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Memuat data gaji...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
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
                      <button
                        onClick={() => void togglePaid(item)}
                        className="rounded-2xl bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-200"
                      >
                        {item.payment_status === 'paid' ? 'Ubah Belum Dibayar' : 'Tandai Sudah Dibayar'}
                      </button>
                    </td>
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

export default OwnerSalaryManager
