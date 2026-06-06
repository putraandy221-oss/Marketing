import { supabase } from './supabaseClient'
import type { NotificationItem, NotificationSettings, NotificationType } from '../types/domain'

export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat notifikasi.')
  }

  return data as NotificationItem[]
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)

  if (error) {
    throw error
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('receiver_id', userId)

  if (error) {
    throw error
  }
}

export async function createNotification(payload: Omit<NotificationItem, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationItem> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal membuat notifikasi.')
  }

  return data as NotificationItem
}

export async function createNotificationIfNotExists(
  payload: Omit<NotificationItem, 'id' | 'created_at' | 'updated_at'>
): Promise<NotificationItem | null> {
  if (!payload.reference_id) {
    return createNotification(payload)
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('receiver_id', payload.receiver_id)
    .eq('type', payload.type)
    .eq('reference_id', payload.reference_id)
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned for single, safe to continue
    throw error
  }

  if (data) {
    return data as NotificationItem
  }

  return createNotification(payload)
}

export async function fetchNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as NotificationSettings
}

export async function upsertNotificationSettings(
  userId: string,
  payload: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .upsert({ user_id: userId, ...payload }, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal menyimpan pengaturan notifikasi.')
  }

  return data as NotificationSettings
}

export async function fetchNotificationSettingsAndEnsure(userId: string): Promise<NotificationSettings> {
  const existing = await fetchNotificationSettings(userId)
  if (existing) {
    return existing
  }

  return upsertNotificationSettings(userId, {
    stock_low: true,
    stock_expiring_h7: true,
    stock_expiring_h3: true,
    feedback_new: true,
    feedback_response: true,
    salary_reminder: true,
  })
}
