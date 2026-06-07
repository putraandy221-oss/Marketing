import { useEffect, useState } from 'react'
import { fetchStaffFeedback, sendFeedback } from '../lib/feedback'
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
      const feedback = await sendFeedback(userId, message.trim())
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
    <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Masukan untuk Pemilik</h2>
              <p className="mt-1 text-sm text-slate-600">Kirim pesan privat yang hanya bisa dilihat oleh pemilik.</p>
            </div>
          </div>
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              placeholder="Tulis masukan, saran, atau pertanyaan Anda..."
            />
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
              >
                {saving ? 'Mengirim...' : 'Kirim Masukan'}
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Riwayat Masukan</h3>
              <p className="mt-1 text-sm text-slate-600">Semua pesan Anda dan balasan pemilik.</p>
            </div>
            <span className="text-sm text-slate-500">{feedbackList.length} pesan</span>
          </div>
          <div className="mt-4 flex flex-col gap-6">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                Memuat riwayat...
              </div>
            ) : feedbackList.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                Belum ada masukan.
              </div>
            ) : (
              feedbackList.map((item) => (
                <article key={item.id} className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                    <span>{new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.is_read_by_owner ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.is_read_by_owner ? 'Sudah dibaca' : 'Belum dibaca'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-orange-500 px-4 py-3 text-white shadow-sm">
                        <p className="text-sm font-semibold">Pesan Anda</p>
                        <p className="mt-2 text-sm leading-6">{item.message}</p>
                      </div>
                    </div>
                    {item.response ? (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-white text-slate-800 border border-slate-200 px-4 py-3 shadow-sm">
                          <p className="text-sm font-semibold">Balasan Pemilik</p>
                          <p className="mt-2 text-sm leading-6">{item.response}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-slate-50 px-4 py-3 text-slate-500 border border-slate-200 shadow-sm">
                          <p className="text-sm italic">Menunggu balasan...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeedbackFormStaff
