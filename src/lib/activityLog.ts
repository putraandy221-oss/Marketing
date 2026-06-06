import { supabase } from './supabaseClient'
import type { ActivityLogItem } from '../types/domain'

export async function createActivityLog(activity: Omit<ActivityLogItem, 'id' | 'created_at' | 'updated_at'>): Promise<ActivityLogItem> {
  const { data, error } = await supabase
    .from('activity_log')
    .insert(activity)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal mencatat aktivitas.')
  }

  return data as ActivityLogItem
}

export async function fetchActivityLog(filters?: {
  userId?: string
  action?: string
  startDate?: string
  endDate?: string
}): Promise<ActivityLogItem[]> {
  let query = supabase.from('activity_log').select('*')

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters?.action) {
    query = query.eq('action', filters.action)
  }

  if (filters?.startDate) {
    query = query.gte('created_at', `${filters.startDate}T00:00:00`)
  }

  if (filters?.endDate) {
    query = query.lte('created_at', `${filters.endDate}T23:59:59`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat log aktivitas.')
  }

  return data as ActivityLogItem[]
}

export async function getActivityLogStats(): Promise<{
  totalActions: number
  uniqueUsers: number
  actionsToday: number
  lastUpdate: string
}> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()

  const { data, error } = await supabase
    .from('activity_log')
    .select('user_id, created_at')

  if (error || !data) {
    throw error ?? new Error('Gagal memuat statistik log aktivitas.')
  }

  const uniqueUsers = new Set(data.map((item: { user_id: any; created_at: any }) => item.user_id)).size
  const actionsToday = data.filter((item: { user_id: any; created_at: any }) => item.created_at >= startOfDay).length

  return {
    totalActions: data.length,
    uniqueUsers,
    actionsToday,
    lastUpdate: new Date().toISOString(),
  }
}
