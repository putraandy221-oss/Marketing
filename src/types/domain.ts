export type NotificationType =
  | 'stock_low'
  | 'stock_expiring_h7'
  | 'stock_expiring_h3'
  | 'feedback_new'
  | 'feedback_response'
  | 'salary_reminder'

export interface NotificationItem {
  id: string
  receiver_id: string
  sender_id?: string | null
  type: NotificationType
  reference_id?: string | null
  title: string
  message: string
  link?: string | null
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface NotificationSettings {
  id: string
  user_id: string
  stock_low: boolean
  stock_expiring_h7: boolean
  stock_expiring_h3: boolean
  feedback_new: boolean
  feedback_response: boolean
  salary_reminder: boolean
  created_at: string
  updated_at: string
}

export type ActivityAction =
  | 'login'
  | 'create_transaction'
  | 'update_transaction'
  | 'delete_transaction'
  | 'create_stock'
  | 'update_stock'
  | 'delete_stock'
  | 'expired_disposed'
  | 'expired_replaced'
  | 'create_salary'
  | 'update_salary'
  | 'delete_salary'
  | 'mark_salary_paid'
  | 'mark_salary_unpaid'
  | 'send_feedback'
  | 'respond_feedback'
  | 'export_report'
  | 'update_notification_settings'

export interface ActivityLogItem {
  id: string
  user_id: string
  user_role: string | null
  action: ActivityAction
  target_type?: string | null
  target_id?: string | null
  description: string
  created_at: string
  updated_at: string
}

export interface StockItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  minimum_stock: number
  expired_at?: string | null
  status: 'available' | 'unavailable'
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name: string
  role: 'owner' | 'manager' | 'staff'
  is_active: boolean
  created_at: string
}

export interface StockExpiredHistoryItem {
  id: string
  stock_id: string
  stock_name?: string
  action: 'disposed' | 'replaced'
  note?: string | null
  expired_at?: string | null
  acted_by: string
  action_date: string
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  status: 'available' | 'unavailable' | 'archived'
  created_at: string
  updated_at: string
}

export interface TransactionItem {
  id: string
  type: 'income' | 'expense' | 'sale' | 'purchase'
  amount: number
  date: string
  description?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface FeedbackItem {
  id: string
  sender_id: string
  owner_id: string
  message: string
  response?: string | null
  status: 'pending' | 'responded'
  is_read_by_owner: boolean
  is_read_by_staff: boolean
  sender_name?: string | null
  created_at: string
  updated_at: string
}

export interface SalaryItem {
  id: string
  employee_name: string
  position: string
  base_salary: number
  allowance: number
  total_salary: number
  period: 'monthly' | 'weekly'
  period_label: string
  due_date: string
  payment_status: 'paid' | 'unpaid'
  paid_at?: string | null
  created_at: string
  updated_at: string
}
