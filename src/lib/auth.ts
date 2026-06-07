import { supabase } from './supabaseClient'
import { createActivityLog } from './activity'
import { createUserProfile } from './profiles'
import type { UserRole } from '../types/auth'

export interface SignInResult {
  role: UserRole | null
  error: string | null
}

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { role: null, error: error.message }
  }

  const user = data.user
  if (!user) {
    return { role: null, error: 'Gagal mengambil data pengguna.' }
  }

  let role = await fetchUserRole(user.id)
  if (!role && user.email) {
    role = await fetchUserRoleByEmail(user.email)
  }

  if (!role) {
    await supabase.auth.signOut()
    return { role: null, error: 'Akun Anda tidak aktif atau belum sepenuhnya terkonfigurasi.' }
  }

  try {
    await createActivityLog({
      user_id: user.id,
      user_role: role,
      action: 'login',
      target_type: 'auth',
      target_id: user.id,
      description: 'User berhasil login ke aplikasi.',
    })
  } catch (err) {
    console.error('Gagal mencatat activity log login:', err)
  }

  return { role, error: null }
}

export async function signUpUser(
  email: string,
  password: string,
  fullName: string,
  role: 'manager' | 'staff'
): Promise<string> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  })

  if (error) {
    throw error
  }

  const user = data.user
  if (!user) {
    throw new Error('Gagal membuat akun pengguna.')
  }

  await createUserProfile(user.id, email, fullName, role)
  return user.id
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) {
    throw error
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function fetchUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) console.error('fetchUserRole error:', error)
  console.log('fetchUserRole result:', data)

  if (!error && data?.role) {
    return data.role as UserRole
  }
  return null
}

export async function fetchUserRoleByEmail(email: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', email)
    .maybeSingle()

  if (error) console.error('fetchUserRoleByEmail error:', error)
  console.log('fetchUserRoleByEmail result:', data)

  if (!error && data?.role) {
    return data.role as UserRole
  }
  return null
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const sessionResult = await supabase.auth.getSession()
  const user = sessionResult.data.session?.user
  if (!user) {
    return null
  }

  let role = await fetchUserRole(user.id)
  if (!role && user.email) {
    role = await fetchUserRoleByEmail(user.email)
  }

  return role
}

export async function getCurrentUserId(): Promise<string | null> {
  const sessionResult = await supabase.auth.getSession()
  return sessionResult.data.session?.user.id ?? null
}
