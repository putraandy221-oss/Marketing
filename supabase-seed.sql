-- Supabase seed script untuk tabel profil dan role FnB Management

-- Pastikan extension pgcrypto tersedia untuk UUID generation.
create extension if not exists "pgcrypto";

-- Buat tabel profil jika belum ada.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now()
);

-- Seed 3 akun dummy/test untuk setiap role.
insert into public.profiles (email, full_name, role)
values
  ('owner@example.com', 'Dana Pemilik', 'owner'),
  ('manager@example.com', 'Maya Manager', 'manager'),
  ('staff@example.com', 'Satria Staff', 'staff')
on conflict (email) do nothing;

-- Jika Anda sudah membuat pengguna di Supabase Auth dengan email yang sama,
-- jalankan perintah berikut untuk mengaitkan profile dengan auth user.
-- update public.profiles p
-- set user_id = u.id
-- from auth.users u
-- where p.email = u.email;

-- Contoh pembuatan akun manual di Supabase Auth untuk testing:
-- owner@example.com / examplePassword1
-- manager@example.com / examplePassword2
-- staff@example.com / examplePassword3

-- Untuk memeriksa seed setelah dijalankan:
-- select * from public.profiles order by role;
