import { supabase } from './supabaseClient'
import type { StockExpiredHistoryItem, StockItem } from '../types/domain'
import { sendNotificationToRole, checkDuplicateNotificationToday, createNotificationIfNotExists } from './notifications'
import { recordStockHistory } from './stockHistory'
import { getCurrentUserId } from './auth'

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

  // Check and notify if stock is low
  try {
    await checkAndNotifyStockLow(data as StockItem)
  } catch (err) {
    console.error('Failed to check stock notifications after create:', err)
  }

  // record stock history
  try {
    const currentUserId = await getCurrentUserId()
    await recordStockHistory((data as StockItem).id, (data as StockItem).name, 'created', null, (data as StockItem).quantity, currentUserId ?? 'system')
  } catch (err) {
    console.error('Failed to record stock history after create:', err)
  }

  return data as StockItem
}

export async function updateStockItem(
  id: string,
  payload: Partial<Omit<StockItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<StockItem> {
  // fetch previous state
  const existingRes = await supabase.from('stock').select('*').eq('id', id).maybeSingle()
  const prev = existingRes.data as StockItem | null

  const { data, error } = await supabase
    .from('stock')
    .update(payload)
    .eq('id', id)
    .select('*')

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    throw error ?? new Error('Gagal memperbarui item stok.')
  }

  const updatedStock = Array.isArray(data) ? data[0] : data

  // record stock history (if quantity changed or metadata changed)
  try {
    const currentUserId = await getCurrentUserId()
    const oldQty = prev ? prev.quantity : null
    const newQty = (updatedStock as StockItem).quantity
    await recordStockHistory(updatedStock.id, updatedStock.name, 'updated', oldQty, newQty, currentUserId ?? 'system')
  } catch (err) {
    console.error('Failed to record stock history after update:', err)
  }

  // Check and notify if stock is low or expiring
  try {
    await Promise.all([
      checkAndNotifyStockLow(updatedStock as StockItem),
      checkAndNotifyStockExpiring(updatedStock as StockItem),
    ])
  } catch (err) {
    console.error('Failed to check stock notifications after update:', err)
  }

  return updatedStock as StockItem
}

export async function deleteStockItem(id: string): Promise<void> {
  // fetch existing for history
  const existingRes = await supabase.from('stock').select('*').eq('id', id).maybeSingle()
  const prev = existingRes.data as StockItem | null

  const { error } = await supabase.from('stock').delete().eq('id', id)
  if (error) {
    throw error
  }

  try {
    const currentUserId = await getCurrentUserId()
    await recordStockHistory(id, prev?.name ?? 'Unknown', 'deleted', prev?.quantity ?? null, null, currentUserId ?? 'system')
  } catch (err) {
    console.error('Failed to record stock history after delete:', err)
  }
}

/**
 * Check if stock is low and send notification to owners and managers
 */
async function checkAndNotifyStockLow(item: StockItem): Promise<void> {
  if (item.quantity <= item.minimum_stock) {
    const truncatedMessage = `Stok ${item.name} tinggal ${item.quantity} ${item.unit}, di bawah batas minimum ${item.minimum_stock}`
    
    try {
      const receivers = await supabase
        .from('profiles')
        .select('user_id')
        .in('role', ['owner', 'manager'])
        .eq('is_active', true)
      
      if (receivers.data && receivers.data.length > 0) {
        for (const receiver of receivers.data) {
          const isDuplicate = await checkDuplicateNotificationToday(
            receiver.user_id,
            'stock_low',
            `stock_low:${item.id}`
          )
          
          if (!isDuplicate) {
            await createNotificationIfNotExists({
              receiver_id: receiver.user_id,
              type: 'stock_low',
              reference_id: `stock_low:${item.id}`,
              title: 'Stok hampir habis',
              message: truncatedMessage,
            })
          }
        }
      }
    } catch (err) {
      console.error('Failed to send stock low notification:', err)
    }
  }
}

/**
 * Check if stock is expiring soon and send notifications
 */
async function checkAndNotifyStockExpiring(item: StockItem): Promise<void> {
  if (!item.expired_at) {
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiredAt = new Date(`${item.expired_at}T00:00:00`)
  const daysUntilExpiry = Math.floor((expiredAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const receivers = await supabase
    .from('profiles')
    .select('user_id')
    .in('role', ['owner', 'manager'])
    .eq('is_active', true)

  if (!receivers.data || receivers.data.length === 0) {
    return
  }

  // Check for H-7 notification
  if (daysUntilExpiry === 7) {
    const message = `${item.name} akan expired pada ${item.expired_at}`
    
    try {
      for (const receiver of receivers.data) {
        const isDuplicate = await checkDuplicateNotificationToday(
          receiver.user_id,
          'stock_expiring_h7',
          `stock_expiring_h7:${item.id}`
        )
        
        if (!isDuplicate) {
          await createNotificationIfNotExists({
            receiver_id: receiver.user_id,
            type: 'stock_expiring_h7',
            reference_id: `stock_expiring_h7:${item.id}`,
            title: 'Stok hampir expired (7 hari)',
            message,
          })
        }
      }
    } catch (err) {
      console.error('Failed to send H-7 expiry notification:', err)
    }
  }

  // Check for H-3 notification
  if (daysUntilExpiry === 3) {
    const message = `${item.name} akan expired pada ${item.expired_at}`
    
    try {
      for (const receiver of receivers.data) {
        const isDuplicate = await checkDuplicateNotificationToday(
          receiver.user_id,
          'stock_expiring_h3',
          `stock_expiring_h3:${item.id}`
        )
        
        if (!isDuplicate) {
          await createNotificationIfNotExists({
            receiver_id: receiver.user_id,
            type: 'stock_expiring_h3',
            reference_id: `stock_expiring_h3:${item.id}`,
            title: 'Stok kritis expired (3 hari)',
            message,
          })
        }
      }
    } catch (err) {
      console.error('Failed to send H-3 expiry notification:', err)
    }
  }
}

/**
 * Check all stocks for expiration warnings (called when stock page loads)
 */
export async function checkAllStocksExpiring(): Promise<void> {
  try {
    const stocks = await fetchStockItems()
    
    for (const stock of stocks) {
      await checkAndNotifyStockExpiring(stock)
    }
  } catch (err) {
    console.error('Failed to check all stocks for expiration:', err)
  }
}

