import { supabase } from './supabaseClient'
import type { FeedbackItem } from '../types/domain'
import { getOwnerUserId } from './profiles'

export async function sendFeedback(userId: string, message: string): Promise<FeedbackItem> {
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

export async function fetchAllFeedback(ownerId?: string): Promise<FeedbackItem[]> {
  const query = supabase.from('feedback').select('*').order('created_at', { ascending: false })
  if (ownerId) {
    query.eq('owner_id', ownerId)
  }
  const { data, error } = await query

  if (error || !data) {
    throw error ?? new Error('Gagal memuat semua masukan.')
  }

  const feedbackItems = data as FeedbackItem[]
  const senderIds = Array.from(new Set(feedbackItems.map((item) => item.sender_id)))
  const profiles = senderIds.length
    ? await supabase.from('profiles').select('user_id, full_name').in('user_id', senderIds)
    : { data: [], error: null }

  if (profiles.error) {
    throw profiles.error
  }

  const profileMap = new Map<string, string>()
  ;(profiles.data ?? []).forEach((profile: any) => {
    if (profile.user_id && profile.full_name) {
      profileMap.set(profile.user_id, profile.full_name)
    }
  })

  return feedbackItems.map((item) => ({
    ...item,
    sender_name: profileMap.get(item.sender_id) ?? null,
  }))
}

export async function replyFeedback(id: string, response: string): Promise<FeedbackItem> {
  const { data, error } = await supabase
    .from('feedback')
    .update({ response, status: 'responded', is_read_by_staff: false, is_read_by_owner: true })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal menanggapi masukan.')
  }

  return data as FeedbackItem
}

export async function markFeedbackAsRead(id: string): Promise<FeedbackItem> {
  const { data, error } = await supabase
    .from('feedback')
    .update({ is_read_by_owner: true })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal menandai masukan sebagai sudah dibaca.')
  }

  return data as FeedbackItem
}
