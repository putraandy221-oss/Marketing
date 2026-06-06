import { useEffect, useState } from 'react'
import { createFeedbackMessage, fetchStaffFeedback } from '../lib/feedback'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activity'
import type { FeedbackItem } from '../types/domain'

const FeedbackFormStaff = () => {
  const [message, setMessage] = useState('')
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const loadFeedback = async (currentUserId: string) => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchStaffFeedback(currentUserId)
      setFeedbackList(items)
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
      if (currentUser) {
        await loadFeedback(currentUser)
      }
    })()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!userId) {
      setError('User belum dikenali.')
      return
    }
    if (!message.trim()) {
      setError('Pesan masukan tidak boleh kosong.')
      return
    }

    setSaving(true)
    try {
      const feedback = await createFeedbackMessage(userId, message.trim())
      await createActivityLog({
        user_id: userId,
        user_role: null,
        action: 'send_feedback',
        target_type: 'feedback',
        target_id: feedback.id,
        description: 'Mengirim masukan karyawan kepada pemilik.',
      })
      setMessage('')
      await loadFeedback(userId)
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
          <h2 className="text-2xl font-semibold text-slate-900">Masukan untuk Pemilik</h2>
          <p className="mt-1 text-sm text-slate-600">Kirim pesan privat yang hanya bisa dilihat oleh pemilik.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Tulis masukan, saran, atau pertanyaan Anda..."
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? 'Mengirim...' : 'Kirim Masukan'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-900">Riwayat Masukan</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Pesan</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Respon</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Memuat riwayat...
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
                    <td className="px-4 py-4 text-slate-700">{item.response ?? '-'}</td>
                    <td className="px-4 py-4 text-slate-700">{item.status}</td>
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

export default FeedbackFormStaff
