import { supabase } from './supabaseClient'
import type { SalaryItem } from '../types/domain'
import { createNotificationIfNotExists, checkDuplicateNotificationToday } from './notifications'

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

/**
 * Check all salaries and send reminders for unpaid salaries that are due
 */
export async function checkAndNotifySalaryReminders(): Promise<void> {
  try {
    const salaries = await fetchSalaries()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all owners
    const owners = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'owner')
      .eq('is_active', true)

    if (!owners.data || owners.data.length === 0) {
      return
    }

    for (const salary of salaries) {
      // Check if salary is unpaid and due date is today or in the past
      if (salary.payment_status === 'unpaid') {
        const dueDate = new Date(`${salary.due_date}T00:00:00`)
        
        if (dueDate <= today) {
          for (const owner of owners.data) {
            const isDuplicate = await checkDuplicateNotificationToday(
              owner.user_id,
              'salary_reminder',
              `salary_${salary.id}`
            )

            if (!isDuplicate) {
              await createNotificationIfNotExists({
                receiver_id: owner.user_id,
                type: 'salary_reminder',
                reference_id: `salary_${salary.id}`,
                title: 'Pengingat: Gaji belum dibayar',
                message: `Gaji untuk ${salary.employee_name} jatuh tempo pada ${salary.due_date}. Segera tinjau dan bayar.`,
              })
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to check salary reminders:', err)
  }
}

