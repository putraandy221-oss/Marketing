import { supabase } from './supabaseClient'
import type { MenuItem } from '../types/domain'

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat data menu.')
  }

  return data as MenuItem[]
}

export async function createMenuItem(payload: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal membuat menu baru.')
  }

  return data as MenuItem
}

export async function updateMenuItem(id: string, payload: Partial<Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>>): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memperbarui menu.')
  }

  return data as MenuItem
}

export async function deleteMenuItem(id: string): Promise<void> {
  const { error } = await supabase.from('menu').delete().eq('id', id)
  if (error) {
    throw error
  }
}
