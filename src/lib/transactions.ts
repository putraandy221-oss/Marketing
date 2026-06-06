import { supabase } from './supabaseClient'
import type { TransactionItem } from '../types/domain'

export async function fetchTransactions(): Promise<TransactionItem[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat transaksi.')
  }

  return data as TransactionItem[]
}

export async function createTransaction(payload: Omit<TransactionItem, 'id' | 'created_at' | 'updated_at'>): Promise<TransactionItem> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal membuat transaksi.')
  }

  return data as TransactionItem
}

export async function updateTransaction(id: string, payload: Partial<Omit<TransactionItem, 'id' | 'created_at' | 'updated_at'>>): Promise<TransactionItem> {
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memperbarui transaksi.')
  }

  return data as TransactionItem
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) {
    throw error
  }
}
