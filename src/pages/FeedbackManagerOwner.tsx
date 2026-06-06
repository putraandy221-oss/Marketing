import { useEffect, useState, type FormEvent } from 'react'
import { fetchOwnerFeedback, respondFeedback } from '../lib/feedback'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activity'
import type { FeedbackItem } from '../types/domain'

const FeedbackManagerOwner = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)

  const loadFeedback = async (currentOwnerId: string) => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchOwnerFeedback(currentOwnerId)
      setFeedbackList(items)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      const currentOwner = await getCurrentUserId()
      setOwnerId(currentOwner)
      if (currentOwner) {
        await loadFeedback(currentOwner)
      }
    })()
  }, [])

  const handleSelect = (item: FeedbackItem) => {
    setSelectedItem(item)
    setResponse(item.response ?? '')
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedItem) return
    if (!response.trim()) {
      setError('Respon tidak boleh kosong.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await respondFeedback(selectedItem.id, response.trim())
      if (ownerId) {
        await createActivityLog({
          user_id: ownerId,
          user_role: null,
          action: 'respond_feedback',
          target_type: 'feedback',
          target_id: selectedItem.id,
          description: 'Menanggapi masukan karyawan.',
        })
        await loadFeedback(ownerId)
      }
      setSelectedItem(null)
      setResponse('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Masukan Karyawan</h2>
          <p className="mt-1 text-sm text-slate-600">Lihat dan balas masukan privat dari karyawan.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Daftar Masukan</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">Pesan</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        Memuat masukan...
                      </td>
                    </tr>
                  ) : feedbackList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        Belum ada masukan.
                      </td>
                    </tr>
                  ) : (
                    feedbackList.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 text-slate-700">{item.message}</td>
                        <td className="px-4 py-4 text-slate-700">{item.status}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleSelect(item)}
                            className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            Balas
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">Balas Masukan</h3>
            {selectedItem ? (
              <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <p className="text-sm text-slate-500">Pesan karyawan:</p>
                  <p className="mt-2 rounded-3xl bg-slate-50 p-4 text-slate-700">{selectedItem.message}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Respon</label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Kirim Respon'}
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Pilih masukan di tabel untuk membalas.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeedbackManagerOwner
