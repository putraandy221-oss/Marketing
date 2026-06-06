-- Supabase schema for FnB management: menu and transactions

create extension if not exists "pgcrypto";

create table if not exists public.menu (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  category text not null,
  status text not null check (status in ('available', 'unavailable', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense', 'sale', 'purchase')),
  amount numeric(12,2) not null check (amount >= 0),
  date date not null,
  description text,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id) references auth.users(id) on delete cascade
);

create table if not exists public.stock (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  quantity numeric(12,2) not null check (quantity >= 0),
  unit text not null,
  minimum_stock numeric(12,2) not null check (minimum_stock >= 0),
  expired_at date,
  status text not null check (status in ('available', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_expired_history (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null,
  action text not null check (action in ('disposed', 'replaced')),
  note text,
  expired_at date,
  acted_by uuid not null,
  action_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (stock_id) references public.stock(id) on delete cascade,
  foreign key (acted_by) references auth.users(id) on delete cascade
);

create table if not exists public.salary (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  position text not null,
  base_salary numeric(12,2) not null check (base_salary >= 0),
  allowance numeric(12,2) not null default 0 check (allowance >= 0),
  total_salary numeric(12,2) not null check (total_salary >= 0),
  period text not null check (period in ('monthly', 'weekly')),
  period_label text not null,
  due_date date not null,
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'unpaid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  receiver_id uuid not null,
  sender_id uuid,
  type text not null check (type in ('stock_low', 'stock_expiring_h7', 'stock_expiring_h3', 'feedback_new', 'feedback_response', 'salary_reminder')),
  reference_id text,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (receiver_id) references auth.users(id) on delete cascade,
  foreign key (sender_id) references auth.users(id) on delete cascade
);

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  stock_low boolean not null default true,
  stock_expiring_h7 boolean not null default true,
  stock_expiring_h3 boolean not null default true,
  feedback_new boolean not null default true,
  feedback_response boolean not null default true,
  salary_reminder boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id) references auth.users(id) on delete cascade
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_role text,
  action text not null,
  target_type text,
  target_id uuid,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id) references auth.users(id) on delete cascade
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  owner_id uuid not null,
  message text not null,
  response text,
  status text not null default 'pending' check (status in ('pending', 'responded')),
  is_read_by_owner boolean not null default false,
  is_read_by_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (sender_id) references auth.users(id) on delete cascade,
  foreign key (owner_id) references auth.users(id) on delete cascade
);

-- Optional helper trigger to update updated_at automatically
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger menu_updated_at
before update on public.menu
for each row
execute function public.set_updated_at();

create trigger transactions_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

create trigger stock_updated_at
before update on public.stock
for each row
execute function public.set_updated_at();

create trigger salary_updated_at
before update on public.salary
for each row
execute function public.set_updated_at();

create trigger notifications_updated_at
before update on public.notifications
for each row
execute function public.set_updated_at();

create trigger notification_settings_updated_at
before update on public.notification_settings
for each row
execute function public.set_updated_at();

create trigger feedback_updated_at
before update on public.feedback
for each row
execute function public.set_updated_at();
