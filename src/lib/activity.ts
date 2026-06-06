import { supabase } from './supabaseClient'
import type { ActivityLogItem } from '../types/domain'

export async function fetchActivityLogs(): Promise<ActivityLogItem[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat log aktivitas.')
  }

  return data as ActivityLogItem[]
}

export async function createActivityLog(
  payload: Omit<ActivityLogItem, 'id' | 'created_at' | 'updated_at'>
): Promise<ActivityLogItem> {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal menyimpan log aktivitas.')
  }

  return data as ActivityLogItem
}
