import { supabase } from './supabaseClient'
import type { SalaryItem } from '../types/domain'

export interface SalaryPaymentHistoryItem {
  id: string
  salary_id: string
  employee_name?: string
  amount: number
  payment_status: 'paid' | 'unpaid'
  paid_at?: string | null
  paid_by?: string | null
  payment_method?: string | null
  note?: string | null
  created_at: string
  updated_at: string
}

export async function fetchSalaryWithPaymentStatus(): Promise<SalaryItem[]> {
  const { data, error } = await supabase
    .from('salaries')
    .select('*')
    .order('due_date', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat data gaji.')
  }

  return data as SalaryItem[]
}

export async function updateSalaryPaymentStatus(salaryId: string, paymentStatus: 'paid' | 'unpaid', paidBy?: string): Promise<SalaryItem> {
  const { data, error } = await supabase
    .from('salaries')
    .update({
      payment_status: paymentStatus,
      paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', salaryId)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memperbarui status pembayaran gaji.')
  }

  // Catat di payment history jika ada function untuk itu
  if (paidBy) {
    await recordSalaryPaymentHistory({
      salary_id: salaryId,
      amount: data.total_salary,
      payment_status: paymentStatus,
      paid_by: paidBy,
      paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
    })
  }

  return data as SalaryItem
}

export async function fetchSalaryPaymentHistory(filters?: {
  salaryId?: string
  startDate?: string
  endDate?: string
}): Promise<SalaryPaymentHistoryItem[]> {
  let query = supabase.from('salary_payment_history').select('*')

  if (filters?.salaryId) {
    query = query.eq('salary_id', filters.salaryId)
  }

  if (filters?.startDate) {
    query = query.gte('paid_at', `${filters.startDate}T00:00:00`)
  }

  if (filters?.endDate) {
    query = query.lte('paid_at', `${filters.endDate}T23:59:59`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error || !data) {
    throw error ?? new Error('Gagal memuat riwayat pembayaran gaji.')
  }

  return data as SalaryPaymentHistoryItem[]
}

export async function recordSalaryPaymentHistory(history: Omit<SalaryPaymentHistoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryPaymentHistoryItem> {
  const { data, error } = await supabase
    .from('salary_payment_history')
    .insert(history)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal mencatat riwayat pembayaran gaji.')
  }

  return data as SalaryPaymentHistoryItem
}

export async function getSalaryStats(): Promise<{
  totalUnpaid: number
  totalPaid: number
  upcomingPayments: number
  overduePayments: number
}> {
  const { data, error } = await supabase.from('salaries').select('payment_status, due_date')

  if (error || !data) {
    throw error ?? new Error('Gagal memuat statistik gaji.')
  }

  const today = new Date().toISOString().slice(0, 10)
  const totalUnpaid = data.filter((item: { payment_status: any; due_date: any }) => item.payment_status === 'unpaid').length
  const totalPaid = data.filter((item: { payment_status: any; due_date: any }) => item.payment_status === 'paid').length
  const upcomingPayments = data.filter((item: { payment_status: any; due_date: any }) => item.due_date > today && item.payment_status === 'unpaid').length
  const overduePayments = data.filter((item: { payment_status: any; due_date: any }) => item.due_date < today && item.payment_status === 'unpaid').length

  return {
    totalUnpaid,
    totalPaid,
    upcomingPayments,
    overduePayments,
  }
}
