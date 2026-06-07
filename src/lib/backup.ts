import { supabase } from './supabaseClient'

const backupTables = [
  'transactions',
  'stock',
  'stock_expired_history',
  'stock_history',
  'salary',
  'salaries',
  'salary_payment_history',
  'feedback',
  'profiles',
  'menu',
  'notifications',
  'notification_settings',
  'activity_logs',
]

export interface BackupPackage {
  metadata: {
    created_at: string
    source: string
  }
  tables: Record<string, unknown[]>
}

export async function fetchBackupData(): Promise<BackupPackage> {
  const queries = backupTables.map((table) => supabase.from(table).select('*'))
  const responses = await Promise.all(queries)

  const tables: Record<string, unknown[]> = {}
  const errors: string[] = []

  responses.forEach((response, index) => {
    const table = backupTables[index]
    const { data, error } = response
    if (error) {
      errors.push(`${table}: ${error.message}`)
      tables[table] = []
    } else {
      tables[table] = (data ?? []) as unknown[]
    }
  })

  if (errors.length > 0) {
    throw new Error(`Gagal memuat backup untuk tabel: ${errors.join(', ')}`)
  }

  return {
    metadata: {
      created_at: new Date().toISOString(),
      source: 'marketing-fnb-app',
    },
    tables,
  }
}
