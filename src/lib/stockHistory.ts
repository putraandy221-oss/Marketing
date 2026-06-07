import { supabase } from './supabaseClient'
import type { StockExpiredHistoryItem } from '../types/domain'

export interface StockHistoryItem {
  id: string
  stock_id: string
  stock_name?: string
  action: 'created' | 'updated' | 'deleted'
  old_quantity?: number | null
  new_quantity?: number | null
  changed_by: string
  change_date: string
  created_at: string
  updated_at: string
}

export async function fetchStockHistory(filters?: {
  stockId?: string
  startDate?: string
  endDate?: string
}): Promise<StockHistoryItem[]> {
  let query = supabase.from('stock_history').select('*')

  if (filters?.stockId) {
    query = query.eq('stock_id', filters.stockId)
  }

  if (filters?.startDate) {
    query = query.gte('change_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('change_date', filters.endDate)
  }

  const { data, error } = await query.order('change_date', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat riwayat stok.')
  }

  return data as StockHistoryItem[]
}

export async function fetchExpiredHistory(filters?: {
  stockId?: string
  startDate?: string
  endDate?: string
}): Promise<StockExpiredHistoryItem[]> {
  let query = supabase.from('stock_expired_history').select('*')

  if (filters?.stockId) {
    query = query.eq('stock_id', filters.stockId)
  }

  if (filters?.startDate) {
    query = query.gte('action_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('action_date', filters.endDate)
  }

  const { data, error } = await query.order('action_date', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat riwayat expired.')
  }

  return data as StockExpiredHistoryItem[]
}

export async function recordExpiredAction(stockId: string, stockName: string, action: 'disposed' | 'replaced', note: string | null, expiredAt: string | null, actedBy: string): Promise<StockExpiredHistoryItem> {
  const { data, error } = await supabase
    .from('stock_expired_history')
    .insert({
      stock_id: stockId,
      stock_name: stockName,
      action,
      note,
      expired_at: expiredAt,
      acted_by: actedBy,
      action_date: new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal mencatat aksi expired.')
  }

  return data as StockExpiredHistoryItem
}

export async function recordStockHistory(
  stockId: string,
  stockName: string,
  action: 'created' | 'updated' | 'deleted',
  oldQuantity: number | null,
  newQuantity: number | null,
  changedBy: string
): Promise<void> {
  const payload = {
    stock_id: stockId,
    stock_name: stockName,
    action,
    old_quantity: oldQuantity,
    new_quantity: newQuantity,
    changed_by: changedBy,
    change_date: new Date().toISOString(),
  }

  const { error } = await supabase.from('stock_history').insert(payload)
  if (error) {
    console.error('Gagal mencatat stock_history:', error)
    // don't throw to avoid breaking the main flow
  }
}
