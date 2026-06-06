# PRD — Sistem Manajemen FnB
**Product Requirements Document**
Versi: 1.0 | Status: Final (siap development)

---

## 1. Ringkasan Produk

Aplikasi manajemen bisnis Food & Beverage (FnB) berbasis web yang responsif di desktop maupun mobile (tidak perlu install aplikasi terpisah). Sistem memiliki tiga peran pengguna dengan tampilan, hak akses, dan fitur yang berbeda-beda sesuai kebutuhan masing-masing.

---

## 2. Tujuan

- Memudahkan pemilik FnB memantau kondisi bisnis secara real-time dari mana saja
- Memberikan manager alat operasional lengkap untuk mengelola stok, laporan, dan tim
- Memudahkan karyawan mencatat data harian tanpa perlu akses ke informasi sensitif
- Membuka jalur komunikasi langsung dan privat antara karyawan dan pemilik
- Mencegah manipulasi data dengan pembatasan akses yang ketat per peran

---

## 3. Pengguna & Peran

Sistem memiliki **3 peran** yang ditentukan saat akun dibuat oleh pemilik. Setiap peran memiliki tampilan dashboard, menu, dan hak akses yang berbeda.

| Peran | Kode | Deskripsi |
|---|---|---|
| Pemilik | `owner` | Akses penuh ke semua data termasuk gaji dan masukan karyawan |
| Manager | `manager` | Akses operasional penuh, tidak bisa ubah gaji, tidak bisa lihat kotak masukan karyawan |
| Karyawan | `staff` | Hanya input data dan kirim masukan ke pemilik |

---

## 4. Alur Login & Autentikasi

### 4.1 Login
- Halaman login tunggal untuk semua peran
- Input: email + password
- Sistem mendeteksi peran dari database dan mengarahkan ke dashboard yang sesuai
- Tampilan, menu, dan data yang tersedia menyesuaikan otomatis berdasarkan peran

### 4.2 Keamanan
- **Lupa password** — kirim link reset ke email terdaftar
- **Sesi otomatis logout** — setelah tidak aktif selama X menit (bisa dikonfigurasi, default 30 menit)
- **Log aktivitas** — setiap aksi input, edit, dan hapus dicatat: siapa, apa, kapan. Hanya bisa dilihat oleh pemilik.
- Hak akses divalidasi di sisi server — bukan hanya di tampilan UI

### 4.3 Kelola Akun (hanya pemilik)
- Tambah akun baru (manager atau karyawan)
- Nonaktifkan akun
- Reset password karyawan/manager
- Tentukan peran saat membuat akun

---

## 5. Modul Fitur

---

### 5.1 Modul Keuangan

#### Pemasukan
- Input: tanggal, jumlah, keterangan, kategori (penjualan tunai, transfer, dll)
- Yang bisa input: karyawan, manager
- Yang bisa lihat: semua peran

#### Pengeluaran
- Input: tanggal, jumlah, keterangan, **kategori pengeluaran**
- Kategori pengeluaran (bisa dikustomisasi oleh pemilik):
  - Bahan baku
  - Listrik & air
  - Gaji (otomatis dari modul gaji)
  - Operasional
  - Lain-lain
- Yang bisa input: karyawan, manager
- Yang bisa lihat: semua peran

#### Laporan Keuangan
- Laporan harian, mingguan, bulanan
- Filter per tanggal dan per kategori
- **Ringkasan laba bersih otomatis** = total pemasukan − total pengeluaran (termasuk gaji)
- Grafik tren pemasukan & pengeluaran
- Export ke PDF dan Excel
- Yang bisa lihat & export: pemilik (full), manager (full), karyawan (tidak bisa)

---

### 5.2 Modul Stok Barang

#### Data Stok
- Field per item: nama barang, kategori, jumlah, satuan, batas minimum stok, tanggal expired (opsional)
- **Kategori barang**: makanan, minuman, kemasan, bahan baku, perlengkapan (bisa dikustomisasi)
- **Satuan stok**: kg, gram, liter, ml, pcs, box, lusin (pilihan, bisa disesuaikan)
- Yang bisa tambah/edit/hapus: manager
- Yang bisa input stok masuk: karyawan, manager
- Yang bisa lihat: semua peran (karyawan hanya view, tidak bisa edit/hapus)

#### Riwayat Stok
- Setiap perubahan stok tercatat: siapa yang mengubah, dari berapa ke berapa, kapan
- Bisa dilihat oleh pemilik dan manager

#### Alert Stok Minimum
- Notifikasi otomatis saat jumlah stok mencapai atau di bawah batas minimum
- Notifikasi muncul di dashboard manager dan pemilik

---

### 5.3 Modul Masa Expired

#### Tracking Expired
- Setiap barang di stok bisa diisi tanggal expired
- Sistem otomatis menampilkan status: aman / hampir expired / sudah expired

#### Notifikasi Expired
- Alert **H-7** (7 hari sebelum expired): peringatan awal
- Alert **H-3** (3 hari sebelum expired): peringatan kritis
- Daftar barang kritis tersendiri di dashboard manager dan pemilik
- Notifikasi muncul di dalam aplikasi (in-app)

#### Tindak Lanjut
- Tombol "Tandai sudah dibuang" atau "Tandai sudah diganti" pada barang expired
- **Riwayat barang expired** — catatan semua barang yang pernah expired, kapan, dan siapa yang menandai
- Yang bisa aksi: manager
- Yang bisa lihat riwayat: pemilik, manager

---

### 5.4 Modul Gaji Karyawan

#### Data Gaji
- Field: nama karyawan, posisi, gaji pokok, tunjangan (opsional), total gaji
- **Periode gaji**: bulanan atau mingguan (bisa dipilih per karyawan)
- Yang bisa input & ubah: **hanya pemilik**
- Yang bisa lihat: pemilik (full) dan manager (hanya lihat, tidak bisa ubah)
- Karyawan: tidak bisa akses sama sekali

#### Status Pembayaran Gaji
- Setiap periode, pemilik menandai status: **Sudah Dibayar** / **Belum Dibayar**
- Notifikasi pengingat jika periode gaji sudah tiba tapi belum ditandai dibayar
- Yang bisa ubah status: hanya pemilik

#### Riwayat Gaji
- Rekap gaji per karyawan per bulan/periode
- Bisa difilter per karyawan atau per periode
- Export ke PDF dan Excel
- Yang bisa akses: pemilik dan manager (hanya lihat)

---

### 5.5 Modul Laporan

#### Laporan Harian
- Ringkasan pemasukan, pengeluaran, dan laba bersih hari itu
- Input oleh karyawan, diverifikasi manager

#### Laporan Bulanan
- Rekap keuangan, stok, dan pengeluaran gaji dalam satu bulan
- Grafik perbandingan bulan ke bulan

#### Filter & Export
- Filter laporan per: tanggal, kategori, peran yang input
- Export semua jenis laporan ke **PDF** dan **Excel**
- Yang bisa akses laporan penuh: pemilik dan manager
- Karyawan: tidak bisa akses laporan keuangan

---

### 5.6 Modul Masukan Karyawan (Direct Feedback)

#### Kirim Masukan
- Karyawan bisa mengirim pesan teks langsung ke pemilik kapan saja
- Konten: bebas (keluhan, saran, pertanyaan gaji, dll)
- Bersifat **privat** — hanya terlihat oleh karyawan pengirim dan pemilik
- Manager **tidak bisa** melihat isi kotak masukan ini

#### Balasan Pemilik
- Pemilik bisa membalas setiap masukan langsung dari aplikasi
- Karyawan menerima notifikasi in-app saat pemilik membalas

#### Status Pesan
- Tanda **sudah dibaca** / **belum dibaca** di sisi pemilik
- Karyawan bisa melihat apakah pesannya sudah dibaca atau belum

#### Notifikasi
- Pemilik mendapat notifikasi in-app saat ada masukan baru
- Karyawan mendapat notifikasi saat pemilik membalas

---

### 5.7 Modul Notifikasi

Semua notifikasi muncul sebagai in-app notification (ikon lonceng di navbar).

| Jenis Notifikasi | Penerima |
|---|---|
| Stok hampir habis (di bawah minimum) | Pemilik, Manager |
| Barang mendekati expired (H-7, H-3) | Pemilik, Manager |
| Masukan baru dari karyawan | Pemilik |
| Balasan masukan dari pemilik | Karyawan |
| Pengingat gaji belum dibayar | Pemilik |

- Setiap jenis notifikasi bisa **diatur on/off** oleh masing-masing pengguna di halaman pengaturan

---

### 5.8 Log Aktivitas

- Semua aksi penting dicatat otomatis oleh sistem: login, input data, edit data, hapus data, export laporan
- Field log: nama pengguna, peran, aksi, data yang diubah, waktu
- Hanya bisa diakses oleh **pemilik**
- Tidak bisa dihapus oleh siapapun (termasuk pemilik)

---

## 6. Dashboard per Peran

### 6.1 Dashboard Pemilik
Ringkas, padat, semua info penting dalam satu layar:
- Total pemasukan & pengeluaran hari ini / bulan ini
- Laba bersih otomatis
- Ringkasan gaji (total yang sudah & belum dibayar)
- Daftar stok kritis (hampir habis & hampir expired)
- Notifikasi terbaru
- Kotak masukan karyawan (badge jumlah pesan belum dibaca)
- Shortcut ke: laporan, gaji, log aktivitas, kelola akun

### 6.2 Dashboard Manager
Lebih detail dengan data operasional:
- Grafik pemasukan & pengeluaran (harian/mingguan)
- Tabel stok barang dengan filter & alert
- Daftar barang hampir expired
- Daftar input karyawan yang perlu diverifikasi
- Riwayat transaksi terbaru
- Laporan singkat hari ini
- Shortcut ke: stok, laporan, verifikasi input

### 6.3 Dashboard Karyawan
Sederhana dan fokus pada aksi:
- Form input cepat: pemasukan / pengeluaran / stok / laporan
- Lihat stok barang (view only)
- Kotak masukan ke pemilik (kirim & lihat balasan)
- Notifikasi balasan dari pemilik

---

## 7. Aturan Akses Ringkas

| Fitur | Pemilik | Manager | Karyawan |
|---|---|---|---|
| Input keuangan | ✓ | ✓ | ✓ |
| Laporan keuangan | ✓ Full | ✓ Full | ✗ |
| Export laporan | ✓ | ✓ | ✗ |
| Input & kelola stok | ✓ | ✓ | Input saja |
| Lihat stok | ✓ | ✓ | ✓ View only |
| Riwayat stok | ✓ | ✓ | ✗ |
| Alert expired | ✓ | ✓ | ✗ |
| Tandai expired | ✗ | ✓ | ✗ |
| Input gaji | ✓ | ✗ | ✗ |
| Lihat gaji | ✓ | ✓ View only | ✗ |
| Status bayar gaji | ✓ | ✗ | ✗ |
| Riwayat gaji | ✓ | ✓ View only | ✗ |
| Kotak masukan (kirim) | ✗ | ✗ | ✓ |
| Kotak masukan (lihat & balas) | ✓ | ✗ | Milik sendiri |
| Log aktivitas | ✓ | ✗ | ✗ |
| Kelola akun pengguna | ✓ | ✗ | ✗ |
| Pengaturan notifikasi | ✓ | ✓ | ✓ |
| Kategori pengeluaran (kustomisasi) | ✓ | ✗ | ✗ |

---

## 8. Teknologi yang Digunakan

| Komponen | Teknologi |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Build / Dev | Vite |
| Routing | React Router DOM |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Database | PostgreSQL via Supabase |
| Autentikasi | Supabase Auth (email + password, role-based) |
| Notifikasi in-app | Supabase Realtime |
| State & data fetching | Supabase JS SDK |
| Hosting | Vercel (frontend) + Supabase (backend & DB) |

> **Catatan untuk AI di VS Code:** Proyek ini menggunakan Supabase sebagai backend utama. Supabase menyediakan database PostgreSQL, autentikasi, realtime, dan storage dalam satu platform, sehingga setup lebih cepat dan sejalan dengan kode yang sudah ada.

---

## 9. Urutan Development yang Disarankan

### Fase 1 — Fondasi (MVP)
1. Setup project React + Tailwind + Supabase
2. Sistem autentikasi: login, logout, role detection, redirect dashboard
3. Struktur database: tabel users, roles, dan hak akses
4. Dashboard dasar per peran (kerangka UI)

### Fase 2 — Fitur Inti
5. Modul keuangan: input pemasukan & pengeluaran + kategori
6. Modul stok barang: CRUD + satuan + kategori + alert minimum
7. Modul masa expired: tracking + alert H-7 & H-3
8. Modul gaji: input pemilik, lihat manager, tersembunyi karyawan

### Fase 3 — Laporan & Komunikasi
9. Laporan harian & bulanan + grafik + filter
10. Export PDF & Excel
11. Modul masukan karyawan: kirim, balas, status baca, notifikasi

### Fase 4 — Keamanan & Pelengkap
12. Log aktivitas
13. Reset password & manajemen sesi
14. Pengaturan notifikasi on/off
15. Riwayat stok & riwayat expired
16. Status & riwayat pembayaran gaji

### Fase 5 — Penyempurnaan
17. Ringkasan laba bersih otomatis di dashboard
18. Dark mode
19. Backup data otomatis
20. Testing menyeluruh & optimasi performa mobile

---

## 10. Catatan Tambahan

- Semua data tersimpan di cloud (Supabase) — bisa diakses dari HP dan laptop tanpa sinkronisasi manual
- Tidak perlu install aplikasi — cukup buka browser di HP atau laptop
- Pastikan tampilan mobile diuji di berbagai ukuran layar (minimal 375px lebar)
- Semua validasi hak akses harus dilakukan di sisi server (backend), bukan hanya di UI
- Gaji dan log aktivitas adalah data paling sensitif — pastikan endpoint API-nya dilindungi ekstra
- Mode gelap tersedia untuk pengguna di dashboard — simpan preferensi di browser
- Backup data tersedia sebagai unduhan JSON; mekanisme restore masih manual di database
- Laporan ekspor dibuat di browser untuk Excel/PDF, sehingga validasi file sebaiknya diuji

---

*Dokumen ini dibuat sebagai panduan pengembangan sistem manajemen FnB. Berikan file ini sebagai konteks kepada AI di VS Code sebelum mulai coding agar AI memahami keseluruhan sistem.*
