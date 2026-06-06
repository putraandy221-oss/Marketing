# FnB Management Web

Proyek awal untuk aplikasi manajemen Food & Beverage berbasis React, Tailwind CSS, dan Supabase.

## Struktur awal

- `src/`: kode sumber aplikasi
- `src/pages/`: halaman untuk tiap peran dan login
- `src/lib/`: helper dan konfigurasi Supabase
- `src/types/`: tipe TypeScript untuk domain aplikasi

## Setup

1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Tambahkan file `.env` dari `supabase.env.example`.
3. Jika menggunakan Supabase, jalankan `supabase-seed.sql` di SQL editor Supabase untuk membuat tabel `profiles` dan seed role dummy.
4. Jalankan development server:
   ```bash
   npm run dev
   ```

## Environment

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
