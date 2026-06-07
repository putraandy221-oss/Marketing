import { useEffect, useRef, useState } from 'react'
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

const NotificationBell = () => {
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleMouseDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [open])

  const visibleNotifications = notifications.filter((notification) => {
    if (!settings) return true
    return settings[notification.type]
  })

  const unreadCount = visibleNotifications.filter((n) => !n.is_read).length

  const handleToggleOpen = () => setOpen(!open)

  const handleMarkRead = async (id: string) => {
    if (!userId) return
    await markNotificationAsRead(id)
    setNotifications((prev) => prev.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)))
  }

  const handleMarkAllRead = async () => {
    if (!userId) return
    await markAllNotificationsRead(userId)
    setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })))
  }

  const handleToggleSetting = async (type: NotificationType) => {
    if (!userId || !settings) return
    const updatedSettings = await upsertNotificationSettings(userId, {
      [type]: !settings[type],
    })
    setSettings(updatedSettings)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={handleToggleOpen}
        className="relative inline-flex items-center rounded-full bg-slate-100 p-3 text-slate-700 hover:bg-slate-200"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[320px] sm:w-[400px] max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl max-h-[60vh] overflow-y-auto">
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

          <div className="mt-4 space-y-3 pr-1">
            {loading ? (
              <p className="text-sm text-slate-500">Memuat notifikasi...</p>
            ) : visibleNotifications.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada notifikasi baru.</p>
            ) : (
              visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-2xl border px-3 py-2 ${notification.is_read ? 'border-slate-200 bg-slate-50' : 'border-sky-200 bg-sky-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 break-words">{notification.title}</p>
                      <p className="mt-1 text-xs text-slate-600 break-words">{notification.message}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</p>
                    </div>
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(notification.id)}
                        className="flex-shrink-0 rounded-xl bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {settings && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Pengaturan Notifikasi</h4>
              <div className="grid gap-2">
                {(Object.keys(settings) as NotificationType[]).filter((type) => notificationLabels[type] !== undefined).map((type) => (
                  <label key={type} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                    <span className="text-xs">{notificationLabels[type]}</span>
                    <input
                      type="checkbox"
                      checked={settings[type]}
                      onChange={() => void handleToggleSetting(type)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell