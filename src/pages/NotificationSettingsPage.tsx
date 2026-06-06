import { useEffect, useState } from 'react'
import { fetchNotificationSettings, updateNotificationSettings } from '../lib/notificationSettings'
import { getCurrentUserId } from '../lib/auth'
import { createActivityLog } from '../lib/activityLog'
import type { NotificationSettings } from '../types/domain'

const NotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const loadSettings = async (currentUserId: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchNotificationSettings(currentUserId)
      setSettings(data)
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
        await loadSettings(currentUser)
      }
    })()
  }, [])

  const handleToggle = async (key: keyof Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!settings || !userId) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updated = await updateNotificationSettings(userId, {
        [key]: !settings[key],
      })
      setSettings(updated)
      setSuccess(true)

      await createActivityLog({
        user_id: userId,
        user_role: null,
        action: 'update_notification_settings',
        target_type: 'notification_settings',
        target_id: null,
        description: `Mengubah pengaturan notifikasi ${key}.`,
      })

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const notificationTypes = [
    {
      key: 'stock_low' as const,
      label: 'Stok Hampir Habis',
      description: 'Notifikasi saat jumlah stok mencapai batas minimum',
    },
    {
      key: 'stock_expiring_h7' as const,
      label: 'Barang Akan Expired (H-7)',
      description: 'Notifikasi 7 hari sebelum barang expired',
    },
    {
      key: 'stock_expiring_h3' as const,
      label: 'Barang Akan Expired (H-3)',
      description: 'Notifikasi 3 hari sebelum barang expired',
    },
    {
      key: 'feedback_new' as const,
      label: 'Masukan Baru dari Karyawan',
      description: 'Notifikasi saat ada masukan/feedback baru',
    },
    {
      key: 'feedback_response' as const,
      label: 'Balasan Feedback',
      description: 'Notifikasi saat ada balasan untuk feedback Anda',
    },
    {
      key: 'salary_reminder' as const,
      label: 'Pengingat Pembayaran Gaji',
      description: 'Notifikasi pengingat jika gaji belum dibayar',
    },
  ]

  if (loading) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <p className="text-center text-slate-500">Memuat pengaturan...</p>
      </section>
    )
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Pengaturan Notifikasi</h2>
          <p className="mt-1 text-sm text-slate-600">Atur jenis notifikasi mana saja yang ingin Anda terima.</p>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-green-600">Pengaturan berhasil disimpan.</p> : null}
      </div>

      <div className="mt-6 space-y-4">
        {settings ? (
          notificationTypes.map((notif) => (
            <div key={notif.key} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{notif.label}</h3>
                <p className="mt-1 text-sm text-slate-600">{notif.description}</p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => void handleToggle(notif.key)}
                  disabled={saving}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                    settings[notif.key] ? 'bg-sky-600' : 'bg-slate-300'
                  } ${saving ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                      settings[notif.key] ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Tidak dapat memuat pengaturan notifikasi.</p>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-900">Informasi</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>• Semua notifikasi ditampilkan sebagai in-app notification (ikon lonceng di navbar)</li>
          <li>• Mengubah pengaturan akan langsung berlaku ke akun Anda</li>
          <li>• Perubahan ini tidak mempengaruhi pengguna lain</li>
        </ul>
      </div>
    </section>
  )
}

export default NotificationSettings
