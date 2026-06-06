import { useEffect, useState, type FormEvent } from 'react'
import type { MenuItem } from '../types/domain'
import { createMenuItem, deleteMenuItem, fetchMenuItems, updateMenuItem } from '../lib/menu'

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'archived', label: 'Archived' },
] as const

const categoryOptions = ['Makanan', 'Minuman', 'Kemasan', 'Bahan Baku', 'Perlengkapan'] as const

type MenuCategory = typeof categoryOptions[number]
type MenuStatus = typeof statusOptions[number]['value']

const OwnerMenuManager = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<MenuCategory>(categoryOptions[0])
  const [status, setStatus] = useState<MenuStatus>(statusOptions[0].value)

  const loadMenu = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchMenuItems()
      setMenuItems(items)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  const resetForm = () => {
    setSelectedItem(null)
    setName('')
    setPrice('')
    setCategory(categoryOptions[0])
    setStatus(statusOptions[0].value)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nama menu diperlukan.')
      return
    }
    if (!price || Number(price) < 0) {
      setError('Harga harus bernilai 0 atau lebih.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        price: Number(price),
        category,
        status,
      }

      if (selectedItem) {
        await updateMenuItem(selectedItem.id, payload)
      } else {
        await createMenuItem(payload)
      }

      await loadMenu()
      resetForm()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item)
    setName(item.name)
    setPrice(String(item.price))
    setCategory(item.category as MenuCategory)
    setStatus(item.status as MenuStatus)
    setError(null)
  }

  const handleDelete = async (item: MenuItem) => {
    const confirmed = window.confirm(`Hapus menu “${item.name}”?`)
    if (!confirmed) return

    setSaving(true)
    try {
      await deleteMenuItem(item.id)
      await loadMenu()
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
          <h2 className="text-2xl font-semibold text-slate-900">Manajemen Menu</h2>
          <p className="mt-1 text-sm text-slate-600">Tambah, edit, dan hapus menu FnB yang tersedia.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Total item: <span className="font-semibold">{menuItems.length}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Form Menu</h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Menu</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Contoh: Nasi Goreng"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Harga</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MenuCategory)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MenuStatus)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {selectedItem ? 'Perbarui Menu' : 'Tambah Menu'}
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
          <h3 className="text-lg font-semibold text-slate-900">Daftar Menu</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Menu</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Kategori</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Harga</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Memuat data menu...
                    </td>
                  </tr>
                ) : menuItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Belum ada menu.
                    </td>
                  </tr>
                ) : (
                  menuItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-4 text-slate-600">{item.category}</td>
                      <td className="px-4 py-4 text-slate-600">Rp {item.price.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'unavailable'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status}
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

export default OwnerMenuManager
