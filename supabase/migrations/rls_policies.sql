-- Enable Row Level Security and define access policies for the FnB Supabase database.
-- This file enables RLS for all requested tables and creates role-based policies
-- using auth.uid() and the profiles table for role checks.

create or replace function public.user_has_role(required_role text) returns boolean
language sql stable as $$
  select exists(
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = required_role
      and p.is_active = true
  );
$$;

create or replace function public.user_is_owner() returns boolean
language sql stable as $$
  select public.user_has_role('owner');
$$;

create or replace function public.user_is_manager() returns boolean
language sql stable as $$
  select public.user_has_role('manager');
$$;

create or replace function public.user_is_staff() returns boolean
language sql stable as $$
  select public.user_has_role('staff');
$$;

create or replace function public.user_is_owner_or_manager() returns boolean
language sql stable as $$
  select public.user_is_owner() or public.user_is_manager();
$$;

-- Profiles
alter table public.profiles enable row level security;

create policy profiles_select_owner_or_self on public.profiles
  for select using (
    public.user_is_owner()
    or user_id = auth.uid()
  );

create policy profiles_insert_owner_or_self on public.profiles
  for insert with check (
    auth.uid() is not null
    and (
      public.user_is_owner()
      or user_id = auth.uid()
    )
  );

create policy profiles_update_owner on public.profiles
  for update using (
    public.user_is_owner()
  ) with check (
    public.user_is_owner()
  );

create policy profiles_delete_owner on public.profiles
  for delete using (
    public.user_is_owner()
  );

-- Transactions
alter table public.transactions enable row level security;

create policy transactions_select_owner_manager on public.transactions
  for select using (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy transactions_insert_authenticated on public.transactions
  for insert with check (
    auth.uid() is not null
    and (
      public.user_is_owner()
      or public.user_is_manager()
      or (public.user_is_staff() and user_id = auth.uid())
    )
  );

create policy transactions_update_owner_manager on public.transactions
  for update using (
    public.user_is_owner()
    or public.user_is_manager()
  ) with check (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy transactions_delete_owner on public.transactions
  for delete using (
    public.user_is_owner()
  );

-- Stock
alter table public.stock enable row level security;

create policy stock_select_all_authenticated on public.stock
  for select using (
    auth.uid() is not null
  );

create policy stock_insert_owner_manager_staff on public.stock
  for insert with check (
    auth.uid() is not null
    and (
      public.user_is_owner()
      or public.user_is_manager()
      or public.user_is_staff()
    )
  );

create policy stock_update_owner_manager on public.stock
  for update using (
    public.user_is_owner()
    or public.user_is_manager()
  ) with check (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy stock_delete_owner_manager on public.stock
  for delete using (
    public.user_is_owner()
    or public.user_is_manager()
  );

-- Stock History
alter table public.stock_history enable row level security;

create policy stock_history_select_owner_manager on public.stock_history
  for select using (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy stock_history_insert_owner_manager on public.stock_history
  for insert with check (
    public.user_is_owner()
    or public.user_is_manager()
  );

-- Stock Expired History
alter table public.stock_expired_history enable row level security;

create policy stock_expired_history_select_owner_manager on public.stock_expired_history
  for select using (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy stock_expired_history_insert_manager on public.stock_expired_history
  for insert with check (
    public.user_is_manager()
    and acted_by = auth.uid()
  );

-- Salary
alter table public.salary enable row level security;

create policy salary_select_owner_manager on public.salary
  for select using (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy salary_insert_owner on public.salary
  for insert with check (
    public.user_is_owner()
  );

create policy salary_update_owner on public.salary
  for update using (
    public.user_is_owner()
  ) with check (
    public.user_is_owner()
  );

create policy salary_delete_owner on public.salary
  for delete using (
    public.user_is_owner()
  );

-- Salary Payment
alter table public.salary_payment enable row level security;

create policy salary_payment_select_owner_manager on public.salary_payment
  for select using (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy salary_payment_insert_owner on public.salary_payment
  for insert with check (
    public.user_is_owner()
  );

create policy salary_payment_update_owner on public.salary_payment
  for update using (
    public.user_is_owner()
  ) with check (
    public.user_is_owner()
  );

create policy salary_payment_delete_owner on public.salary_payment
  for delete using (
    public.user_is_owner()
  );

-- Feedback
alter table public.feedback enable row level security;

create policy feedback_select_owner_or_sender on public.feedback
  for select using (
    public.user_is_owner()
    or (public.user_is_staff() and sender_id = auth.uid())
  );

create policy feedback_insert_staff_sender on public.feedback
  for insert with check (
    public.user_is_staff()
    and sender_id = auth.uid()
  );

create policy feedback_update_owner on public.feedback
  for update using (
    public.user_is_owner()
  ) with check (
    public.user_is_owner()
  );

-- Notifications
alter table public.notifications enable row level security;

create policy notifications_select_receiver on public.notifications
  for select using (
    receiver_id = auth.uid()
  );

create policy notifications_insert_authenticated on public.notifications
  for insert with check (
    auth.uid() is not null
    and (
      sender_id = auth.uid()
      or receiver_id = auth.uid()
      or sender_id is null
    )
  );

create policy notifications_update_receiver on public.notifications
  for update using (
    receiver_id = auth.uid()
  ) with check (
    receiver_id = auth.uid()
  );

-- Notification Settings
alter table public.notification_settings enable row level security;

create policy notification_settings_select_own on public.notification_settings
  for select using (
    user_id = auth.uid()
  );

create policy notification_settings_insert_own on public.notification_settings
  for insert with check (
    user_id = auth.uid()
  );

create policy notification_settings_update_own on public.notification_settings
  for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
  );

-- Activity Logs
alter table public.activity_logs enable row level security;

create policy activity_logs_select_owner on public.activity_logs
  for select using (
    public.user_is_owner()
  );

create policy activity_logs_insert_authenticated on public.activity_logs
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- Menu
alter table public.menu enable row level security;

create policy menu_select_all_authenticated on public.menu
  for select using (
    auth.uid() is not null
  );

create policy menu_insert_owner_manager on public.menu
  for insert with check (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy menu_update_owner_manager on public.menu
  for update using (
    public.user_is_owner()
    or public.user_is_manager()
  ) with check (
    public.user_is_owner()
    or public.user_is_manager()
  );

create policy menu_delete_owner_manager on public.menu
  for delete using (
    public.user_is_owner()
    or public.user_is_manager()
  );
