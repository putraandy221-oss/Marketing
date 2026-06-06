import { supabase } from './supabaseClient'
import type { StockExpiredHistoryItem, StockItem } from '../types/domain'

const MS_PER_DAY = 1000 * 60 * 60 * 24

export type StockExpirationState =
  | { state: 'none'; label: '-'; variant: 'slate'; days: null }
  | { state: 'safe'; label: string; variant: 'emerald'; days: number }
  | { state: 'h-7'; label: string; variant: 'amber'; days: number }
  | { state: 'h-3'; label: string; variant: 'orange'; days: number }
  | { state: 'expired'; label: string; variant: 'rose'; days: number }

export function getStockExpirationState(expiredAt?: string | null): StockExpirationState {
  if (!expiredAt) {
    return { state: 'none', label: '-', variant: 'slate', days: null }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiration = new Date(`${expiredAt}T00:00:00`)
  const diffDays = Math.floor((expiration.getTime() - today.getTime()) / MS_PER_DAY)

  if (diffDays < 0) {
    return { state: 'expired', label: 'Sudah expired', variant: 'rose', days: diffDays }
  }

  if (diffDays <= 3) {
    return { state: 'h-3', label: `H-3 (${diffDays} hari)`, variant: 'orange', days: diffDays }
  }

  if (diffDays <= 7) {
    return { state: 'h-7', label: `H-7 (${diffDays} hari)`, variant: 'amber', days: diffDays }
  }

  return { state: 'safe', label: `Aman (${diffDays} hari)`, variant: 'emerald', days: diffDays }
}

export async function fetchStockItems(): Promise<StockItem[]> {
  const { data, error } = await supabase
    .from('stock')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat data stok.')
  }

  return data as StockItem[]
}

export async function fetchStockExpiredHistory(): Promise<StockExpiredHistoryItem[]> {
  const { data, error } = await supabase
    .from('stock_expired_history')
    .select('*, stock(name)')
    .order('action_date', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat riwayat expired stok.')
  }

  return (data as any[]).map((item) => ({
    ...item,
    stock_name: item.stock?.name ?? 'Unknown',
  })) as StockExpiredHistoryItem[]
}

type NewStockExpiredHistoryPayload = Omit<StockExpiredHistoryItem, 'id' | 'created_at' | 'updated_at' | 'stock_name' | 'action_date'>

export async function createStockExpiredHistory(
  payload: NewStockExpiredHistoryPayload
): Promise<StockExpiredHistoryItem> {
  const { data, error } = await supabase
    .from('stock_expired_history')
    .insert(payload)
    .select('*, stock(name)')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal menyimpan riwayat barang expired.')
  }

  return {
    ...data,
    stock_name: (data as any).stock?.name ?? 'Unknown',
  } as StockExpiredHistoryItem
}

export async function createStockItem(payload: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>): Promise<StockItem> {
  const { data, error } = await supabase
    .from('stock')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal membuat item stok.')
  }

  return data as StockItem
}

export async function updateStockItem(
  id: string,
  payload: Partial<Omit<StockItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<StockItem> {
  const { data, error } = await supabase
    .from('stock')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memperbarui item stok.')
  }

  return data as StockItem
}

export async function deleteStockItem(id: string): Promise<void> {
  const { error } = await supabase.from('stock').delete().eq('id', id)
  if (error) {
    throw error
  }
}
