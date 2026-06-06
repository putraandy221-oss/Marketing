import { supabase } from './supabaseClient'
import type { NotificationSettings } from '../types/domain'

export async function fetchNotificationSettings(userId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memuat pengaturan notifikasi.')
  }

  return data as NotificationSettings
}

export async function updateNotificationSettings(userId: string, settings: Partial<Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .update(settings)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal menyimpan pengaturan notifikasi.')
  }

  return data as NotificationSettings
}

export async function createNotificationSettings(userId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .insert({
      user_id: userId,
      stock_low: true,
      stock_expiring_h7: true,
      stock_expiring_h3: true,
      feedback_new: true,
      feedback_response: true,
      salary_reminder: true,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal membuat pengaturan notifikasi.')
  }

  return data as NotificationSettings
}
