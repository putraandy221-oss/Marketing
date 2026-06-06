import { supabase } from './supabaseClient'
import type { SalaryItem } from '../types/domain'

export async function fetchSalaries(): Promise<SalaryItem[]> {
  const { data, error } = await supabase
    .from('salary')
    .select('*')
    .order('due_date', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat data gaji.')
  }

  return data as SalaryItem[]
}

export async function createSalary(payload: Omit<SalaryItem, 'id' | 'created_at' | 'updated_at' | 'paid_at'>): Promise<SalaryItem> {
  const { data, error } = await supabase
    .from('salary')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal membuat data gaji.')
  }

  return data as SalaryItem
}

export async function updateSalary(
  id: string,
  payload: Partial<Omit<SalaryItem, 'id' | 'created_at' | 'updated_at' | 'paid_at'>>
): Promise<SalaryItem> {
  const { data, error } = await supabase
    .from('salary')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memperbarui data gaji.')
  }

  return data as SalaryItem
}

export async function deleteSalary(id: string): Promise<void> {
  const { error } = await supabase.from('salary').delete().eq('id', id)
  if (error) {
    throw error
  }
}

export async function markSalaryPaid(id: string): Promise<SalaryItem> {
  const { data, error } = await supabase
    .from('salary')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal menandai gaji sebagai telah dibayar.')
  }

  return data as SalaryItem
}

export async function markSalaryUnpaid(id: string): Promise<SalaryItem> {
  const { data, error } = await supabase
    .from('salary')
    .update({ payment_status: 'unpaid', paid_at: null })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal mengubah status gaji menjadi belum dibayar.')
  }

  return data as SalaryItem
}
