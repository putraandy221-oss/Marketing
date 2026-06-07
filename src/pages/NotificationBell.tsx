import { useEffect, useState } from 'react'
import { getCurrentUserId } from '../lib/auth'
import {
  fetchNotificationSettingsAndEnsure,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationAsRead,
  upsertNotificationSettings,
} from '../lib/notifications'
import type { NotificationItem, NotificationSettings, NotificationType } from '../types/domain'

const notificationLabels: Record<NotificationType, string> = {
  stock_low: 'Stok rendah',
  stock_expiring_h7: 'Stok hampir expired',
  stock_expiring_h3: 'Stok kritis expired',
  feedback_new: 'Masukan baru',
  feedback_response: 'Balasan masukan',
  salary_reminder: 'Pengingat gaji',
}

const notificationDescriptions: Record<NotificationType, string> = {
  stock_low: 'Item stok di bawah batas minimum.',
  stock_expiring_h7: 'Item stok akan expired dalam 7 hari.',
  stock_expiring_h3: 'Item stok akan expired dalam 3 hari.',
  feedback_new: 'Karyawan mengirim masukan baru.',
  feedback_response: 'Pemilik membalas masukan Anda.',
  salary_reminder: 'Gaji belum dibayar pada periode ini.',
}

const NotificationBell = () => {
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = async (currentUserId: string) => {
    setLoading(true)
    const [notificationsData, settingsData] = await Promise.all([
      fetchNotifications(currentUserId),
      fetchNotificationSettingsAndEnsure(currentUserId),
    ])
    setNotifications(notificationsData)
    setSettings(settingsData)
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      const current = await getCurrentUserId()
      if (!current) return
      setUserId(current)
      await load(current)
    })()
  }, [])

  const visibleNotifications = notifications.filter((notification) => {
    if (!settings) return true
    return settings[notification.type]
  })

  const unreadCount = visibleNotifications.filter((notification) => !notification.is_read).length

  const handleToggleOpen = () => {
    setOpen(!open)
  }

  const handleMarkRead = async (id: string) => {
    if (!userId) return
    await markNotificationAsRead(id)
    await load(userId)
  }

  const handleMarkAllRead = async () => {
    if (!userId) return
    await markAllNotificationsRead(userId)
    await load(userId)
  }

  const handleToggleSetting = async (type: NotificationType) => {
    if (!userId || !settings) return
    const updatedSettings = await upsertNotificationSettings(userId, {
      [type]: !settings[type],
    })
    setSettings(updatedSettings)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggleOpen}
        className="relative inline-flex items-center rounded-full bg-slate-100 p-3 text-slate-700 hover:bg-slate-200"
      >
        <span role="img" aria-label="notif" className="text-lg">
          🔔
        </span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-80 md:w-96 max-w-full rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Notifikasi</h3>
              <p className="text-sm text-slate-500">Seluruh notifikasi aplikasi Anda.</p>
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="w-full rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Tandai semua dibaca
            </button>
          </div>

          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-500">Memuat notifikasi...</p>
            ) : visibleNotifications.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada notifikasi baru.</p>
            ) : (
              visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-3xl border px-4 py-3 ${notification.is_read ? 'border-slate-200 bg-slate-50' : 'border-sky-200 bg-sky-50'}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 whitespace-normal break-words">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600 whitespace-normal break-words">{notification.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(notification.id)}
                      className="sm:flex-shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 whitespace-nowrap"
                    >
                      {notification.is_read ? 'Dibaca' : 'Tandai dibaca'}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 whitespace-normal break-words">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>

          {settings ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Pengaturan Notifikasi</h4>
                  <p className="text-xs text-slate-500">Nyalakan atau matikan jenis notifikasi.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {(Object.keys(settings) as NotificationType[]).map((type) => (
                  <label key={type} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                    <span>{notificationLabels[type]}</span>
                    <input
                      type="checkbox"
                      checked={settings[type]}
                      onChange={() => void handleToggleSetting(type)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default NotificationBell
