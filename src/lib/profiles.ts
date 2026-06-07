import { supabase } from './supabaseClient'
import type { UserProfile } from '../types/domain'

export async function getOwnerUserId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('role', 'owner')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error || !data?.user_id) {
    return null
  }

  return data.user_id as string
}

export async function fetchUsersByRoles(roles: string[]): Promise<string[]> {
  const results: string[] = []
  for (const role of roles) {
    const { data, error } = await supabase.rpc('get_user_ids_by_role', { target_role: role })
    if (!error && data) {
      results.push(...data.map((item: any) => item.user_id as string))
    }
  }
  return results
}

export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat profil pengguna.')
  }

  return data as UserProfile[]
}

export async function findProfileByEmail(email: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as UserProfile
}

export async function createUserProfile(userId: string, email: string, fullName: string, role: 'manager' | 'staff'): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, email, full_name: fullName, role, is_active: true })
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal membuat profil pengguna.')
  }

  return data as UserProfile
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memperbarui status pengguna.')
  }

  return data as UserProfile
}

export async function fetchProfileByUserId(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as UserProfile
}
