import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchSalaries } from '../lib/salaries'
import { fetchStockItems } from '../lib/stock'
import { fetchTransactions } from '../lib/transactions'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activity'
import type { SalaryItem, StockItem, TransactionItem } from '../types/domain'

type ReportPeriod = 'daily' | 'weekly' | 'monthly'

type TransactionCategory = 'all' | 'income' | 'expense' | 'sale' | 'purchase'

const transactionCategoryOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'sale', label: 'Penjualan' },
  { value: 'purchase', label: 'Pembelian' },
] as const

const ReportManager = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [salaries, setSalaries] = useState<SalaryItem[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<ReportPeriod>('daily')
  const [dateValue, setDateValue] = useState(new Date().toISOString().slice(0, 10))
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [transactionCategory, setTransactionCategory] = useState<TransactionCategory>('all')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [transactionData, salaryData, stockData] = await Promise.all([
        fetchTransactions(),
        fetchSalaries(),
        fetchStockItems(),
      ])
      setTransactions(transactionData)
      setSalaries(salaryData)
      setStockItems(stockData)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (period === 'daily') {
      setStartDate(dateValue)
      setEndDate(dateValue)
    } else if (period === 'weekly') {
      const selected = new Date(dateValue)
      selected.setHours(0, 0, 0, 0)
      const weekStart = new Date(selected)
      weekStart.setDate(selected.getDate() - selected.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      setStartDate(weekStart.toISOString().slice(0, 10))
      setEndDate(weekEnd.toISOString().slice(0, 10))
    } else {
      const selected = new Date(dateValue)
      const year = selected.getFullYear()
      const month = selected.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      setStartDate(firstDay.toISOString().slice(0, 10))
      setEndDate(lastDay.toISOString().slice(0, 10))
    }
  }, [period, dateValue])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionDate = transaction.date
      return (
        transactionDate >= startDate &&
        transactionDate <= endDate &&
        (transactionCategory === 'all' || transaction.type === transactionCategory)
      )
    })
  }, [transactions, startDate, endDate, transactionCategory])

  const filteredSalaries = useMemo(() => {
    return salaries.filter((salary) => salary.due_date >= startDate && salary.due_date <= endDate)
  }, [salaries, startDate, endDate])

  const summary = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter((item) => item.type === 'income' || item.type === 'sale')
      .reduce((sum, item) => sum + item.amount, 0)

    const totalExpense = filteredTransactions
      .filter((item) => item.type === 'expense' || item.type === 'purchase')
      .reduce((sum, item) => sum + item.amount, 0)

    const totalSalary = filteredSalaries.reduce((sum, item) => sum + item.total_salary, 0)
    const netProfit = totalIncome - totalExpense - totalSalary

    return {
      totalIncome,
      totalExpense,
      totalSalary,
      netProfit,
    }
  }, [filteredTransactions, filteredSalaries])

  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`

  const buildReportHeader = () => {
    return `Laporan ${period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan'}\nPeriode: ${startDate} s/d ${endDate}`
  }

  const exportTableToHtml = () => {
    const rows = [
      ['Tipe', 'Jumlah', 'Tanggal', 'Keterangan', 'User ID'],
      ...filteredTransactions.map((item) => [item.type, item.amount.toString(), item.date, item.description ?? '-', item.user_id]),
    ]
    return rows
      .map((row) => `<tr>${row.map((cell) => `<td>${String(cell)}</td>`).join('')}</tr>`)
      .join('')
  }

  const handleExportExcel = async () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1"><tr><th colSpan="5">${buildReportHeader()}</th></tr><tr><th>Tipe</th><th>Jumlah</th><th>Tanggal</th><th>Keterangan</th><th>User ID</th></tr>${exportTableToHtml()}</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `laporan-${period}-${startDate}.xls`
    link.click()
    URL.revokeObjectURL(url)

    const currentUserId = await getCurrentUserId()
    if (currentUserId) {
      await createActivityLog({
        user_id: currentUserId,
        user_role: null,
        action: 'export_report',
        target_type: 'report',
        target_id: null,
        description: `Mengekspor laporan ${period} ke Excel.`,
      })
    }
  }

  const handleExportPdf = async () => {
    const printWindow = window.open('', '_blank', 'width=900,height=600')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Laporan</title><style>body{font-family:Arial,sans-serif;padding:24px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;}th{background:#f8fafc;text-align:left;}</style></head><body><h1>Laporan ${period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan'}</h1><p>Periode: ${startDate} s/d ${endDate}</p><table><thead><tr><th>Tipe</th><th>Jumlah</th><th>Tanggal</th><th>Keterangan</th><th>User ID</th></tr></thead><tbody>${exportTableToHtml()}</tbody></table><p>Total Pemasukan: ${formatCurrency(summary.totalIncome)}</p><p>Total Pengeluaran: ${formatCurrency(summary.totalExpense)}</p><p>Total Gaji: ${formatCurrency(summary.totalSalary)}</p><p>Laba Bersih: ${formatCurrency(summary.netProfit)}</p></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    void printWindow.print()

    const currentUserId = await getCurrentUserId()
    if (currentUserId) {
      await createActivityLog({
        user_id: currentUserId,
        user_role: null,
        action: 'export_report',
        target_type: 'report',
        target_id: null,
        description: `Mengekspor laporan ${period} ke PDF.`,
      })
    }
  }

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Modul Laporan</h2>
          <p className="mt-1 text-sm text-slate-600">Laporan harian, mingguan, dan bulanan dengan ringkasan laba bersih.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Filter laporan
        </div>
      </div>

      <form className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]" onSubmit={handleFilterSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">Jenis Laporan</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Tanggal Referensi</label>
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Kategori Transaksi</label>
          <select
            value={transactionCategory}
            onChange={(e) => setTransactionCategory(e.target.value as TransactionCategory)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            {transactionCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Total Pemasukan</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(summary.totalIncome)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Total Pengeluaran</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(summary.totalExpense)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Total Gaji</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(summary.totalSalary)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Laba Bersih</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(summary.netProfit)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleExportExcel}
          className="inline-flex justify-center rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          Export ke Excel
        </button>
        <button
          onClick={handleExportPdf}
          className="inline-flex justify-center rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
        >
          Export ke PDF
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Tipe</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Jumlah</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Tanggal</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Keterangan</th>
              <th className="px-4 py-3 font-semibold text-slate-700">User ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Memuat laporan...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Tidak ada transaksi untuk periode ini.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-medium text-slate-900">{item.type}</td>
                  <td className="px-4 py-4 text-slate-600">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-4 text-slate-600">{item.date}</td>
                  <td className="px-4 py-4 text-slate-600">{item.description ?? '-'}</td>
                  <td className="px-4 py-4 text-slate-600">{item.user_id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-lg font-semibold text-slate-900">Ringkasan Stok</h3>
        <p className="mt-2 text-sm text-slate-600">Jumlah item stok saat ini dan kapasitas minimum.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Item Stok</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stockItems.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Item di bawah minimum</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stockItems.filter((item) => item.quantity <= item.minimum_stock).length}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Item mendekati expired</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stockItems.filter((item) => {
              if (!item.expired_at) return false
              const today = new Date()
              const expiry = new Date(`${item.expired_at}T00:00:00`)
              const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              return diff <= 7 && diff >= 0
            }).length}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ReportManager
