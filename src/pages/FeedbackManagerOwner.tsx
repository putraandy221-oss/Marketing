import { useEffect, useState, type FormEvent } from 'react'
import { fetchAllFeedback, markFeedbackAsRead, replyFeedback } from '../lib/feedback'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activity'
import type { FeedbackItem } from '../types/domain'

const FeedbackManagerOwner = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)

  const loadFeedback = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchAllFeedback()
      setFeedbackList(items)
      return items
    } catch (err) {
      setError((err as Error).message)
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      const currentOwner = await getCurrentUserId()
      setOwnerId(currentOwner)
      if (currentOwner) {
        await loadFeedback()
      }
    })()
  }, [])

  const handleToggle = async (item: FeedbackItem) => {
    setError(null)
    if (expandedId === item.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(item.id)
    setReplyInputs((prev) => ({
      ...prev,
      [item.id]: item.response ?? '',
    }))

    if (!item.is_read_by_owner) {
      try {
        await markFeedbackAsRead(item.id)
        await loadFeedback()
      } catch (err) {
        setError((err as Error).message)
      }
    }
  }

  const handleReply = async (event: FormEvent<HTMLFormElement>, itemId: string) => {
    event.preventDefault()
    setError(null)

    const reply = replyInputs[itemId]?.trim() ?? ''
    if (!reply) {
      setError('Respon tidak boleh kosong.')
      return
    }

    setSaving(true)
    try {
      await replyFeedback(itemId, reply)
      if (ownerId) {
        await createActivityLog({
          user_id: ownerId,
          user_role: null,
          action: 'respond_feedback',
          target_type: 'feedback',
          target_id: itemId,
          description: 'Menanggapi masukan karyawan.',
        })
        await loadFeedback()
      }
      setReplyInputs((prev) => ({ ...prev, [itemId]: '' }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Masukan Karyawan</h2>
          <p className="mt-1 text-sm text-slate-600">Lihat dan balas masukan privat dari karyawan.</p>
        </div>

        <div className="space-y-4">
          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              Memuat masukan...
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              Belum ada masukan.
            </div>
          ) : (
            feedbackList.map((item) => (
              <article key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.sender_name ?? 'Staff'}</p>
                    <p className="text-sm text-slate-500">{new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.is_read_by_owner ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.is_read_by_owner ? 'Sudah dibaca' : 'Belum dibaca'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleToggle(item)}
                      className="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                    >
                      {expandedId === item.id ? 'Tutup' : 'Buka'}
                    </button>
                  </div>
                </div>

                {expandedId === item.id ? (
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-3xl bg-white px-4 py-3 text-slate-900 shadow-sm border border-slate-200">
                          <p className="text-sm font-semibold text-slate-700">Pesan Staff</p>
                          <p className="mt-2 text-sm leading-6">{item.message}</p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-3xl bg-amber-50 px-4 py-3 text-slate-900 shadow-sm">
                          <p className="text-sm font-semibold text-slate-700">Respon Anda</p>
                          <p className={`mt-2 text-sm leading-6 ${item.response ? 'text-slate-900' : 'text-slate-500'}`}>
                            {item.response ?? 'Belum ada respon.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!item.response ? (
                      <form onSubmit={(event) => void handleReply(event, item.id)} className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">Balas pesan</label>
                        <textarea
                          value={replyInputs[item.id] ?? ''}
                          onChange={(e) => setReplyInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          rows={4}
                          className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                          placeholder="Tulis balasan untuk staff..."
                        />
                        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={saving}
                            className="min-h-[44px] rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                          >
                            {saving ? 'Menyimpan...' : 'Kirim Respon'}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default FeedbackManagerOwner
