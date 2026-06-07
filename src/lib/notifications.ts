import { supabase } from './supabaseClient'
import type { NotificationItem, NotificationSettings, NotificationType } from '../types/domain'
import { fetchUsersByRoles } from './profiles'

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

export async function createNotification(payload: Omit<NotificationItem, 'id' | 'created_at' | 'updated_at' | 'is_read'> & { is_read?: boolean }): Promise<NotificationItem> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ ...payload, is_read: payload.is_read ?? false })
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal membuat notifikasi.')
  }

  return data as NotificationItem
}

export async function createNotificationIfNotExists(
  payload: Omit<NotificationItem, 'id' | 'created_at' | 'updated_at' | 'is_read'> & { receiver_id: string; type: NotificationType; is_read?: boolean }
): Promise<NotificationItem | null> {
  const payloadWithDefaults = { ...payload, is_read: payload.is_read ?? false }
  
  if (!payload.reference_id) {
    return createNotification(payloadWithDefaults)
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

  return createNotification(payloadWithDefaults)
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

/**
 * Send notification to all users with a specific role
 */
export async function sendNotificationToRole(
  roles: ('owner' | 'manager' | 'staff')[],
  payload: Partial<Omit<NotificationItem, 'id' | 'created_at' | 'updated_at' | 'receiver_id' | 'is_read'>> & { type: NotificationType; title: string; message: string; is_read?: boolean }
): Promise<NotificationItem[]> {
  const receiverIds = await fetchUsersByRoles(roles as string[])
  if (receiverIds.length === 0) {
    return []
  }

  const results: NotificationItem[] = []
  for (const receiverId of receiverIds) {
    try {
      const notification = await createNotificationIfNotExists({
        ...payload,
        receiver_id: receiverId,
      })
      if (notification) {
        results.push(notification)
      }
    } catch (err) {
      console.error(`Failed to send notification to ${receiverId}:`, err)
    }
  }

  return results
}

/**
 * Check if a duplicate notification already exists for today
 * Returns true if duplicate found, false otherwise
 */
export async function checkDuplicateNotificationToday(
  receiverId: string,
  type: NotificationType,
  referenceId: string
): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', receiverId)
    .eq('type', type)
    .eq('reference_id', referenceId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking duplicate notification:', error)
    return false
  }

  return data !== null && data.length > 0
}

