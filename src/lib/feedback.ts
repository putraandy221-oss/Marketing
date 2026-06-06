import { supabase } from './supabaseClient'
import type { FeedbackItem } from '../types/domain'
import { getOwnerUserId } from './profiles'

export async function createFeedbackMessage(userId: string, message: string): Promise<FeedbackItem> {
  const ownerId = await getOwnerUserId()
  if (!ownerId) {
    throw new Error('Pemilik tidak ditemukan. Pastikan role owner sudah tersedia.')
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({ sender_id: userId, owner_id: ownerId, message, status: 'pending' })
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal mengirim masukan.')
  }

  return data as FeedbackItem
}

export async function fetchOwnerFeedback(ownerId: string): Promise<FeedbackItem[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat masukan.')
  }

  return data as FeedbackItem[]
}

export async function fetchStaffFeedback(userId: string): Promise<FeedbackItem[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat masukan Anda.')
  }

  return data as FeedbackItem[]
}

export async function respondFeedback(id: string, response: string): Promise<FeedbackItem> {
  const { data, error } = await supabase
    .from('feedback')
    .update({ response, status: 'responded', is_read_by_staff: false })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal menanggapi masukan.')
  }

  return data as FeedbackItem
}
