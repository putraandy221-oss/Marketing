import { useEffect, useState, type FormEvent } from 'react'
import { fetchAllProfiles, findProfileByEmail, toggleUserActive } from '../lib/profiles'
import { signUpUser } from '../lib/auth'
import { sendPasswordResetEmail } from '../lib/auth'
import type { UserProfile } from '../types/domain'

const roles = [
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Karyawan' },
] as const

type RoleType = typeof roles[number]['value']

const OwnerAccountManager = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleType>('manager')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadProfiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchAllProfiles()
      setProfiles(items)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfiles()
  }, [])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setRole('manager')
    setError(null)
    setSuccess(null)
  }

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!fullName.trim()) {
      setError('Nama lengkap diperlukan.')
      return
    }
    if (!email.trim()) {
      setError('Email diperlukan.')
      return
    }
    if (!password || password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    setSaving(true)
    try {
      const existing = await findProfileByEmail(email.trim())
      if (existing) {
        throw new Error('Email sudah terdaftar. Gunakan email lain atau aktifkan akun yang sudah ada.')
      }

      await signUpUser(email.trim(), password, fullName.trim(), role)
      setSuccess('Akun berhasil dibuat. Pengguna akan menerima email aktivasi/password reset jika diperlukan.')
      resetForm()
      await loadProfiles()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (profile: UserProfile) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await toggleUserActive(profile.user_id, !profile.is_active)
      setSuccess(`Akun ${profile.email} berhasil ${profile.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`)
      await loadProfiles()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (profile: UserProfile) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (!profile.email) {
        throw new Error('Email pengguna tidak ditemukan.')
      }
      await sendPasswordResetEmail(profile.email)
      setSuccess(`Link reset password telah dikirim ke ${profile.email}.`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-slate-200" id="kelola-akun">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Kelola Akun</h2>
          <p className="mt-1 text-sm text-slate-600">Tambah, nonaktifkan, dan reset password untuk manager atau karyawan.</p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="text-lg font-semibold text-slate-900">Buat Akun Baru</h3>
            <form className="mt-5 space-y-4" onSubmit={handleCreateAccount}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Nama Lengkap</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Peran</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleType)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {roles.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Buat Akun'}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-semibold text-slate-900">Daftar Akun</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">Nama</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        Memuat akun...
                      </td>
                    </tr>
                  ) : profiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        Belum ada akun.
                      </td>
                    </tr>
                  ) : (
                    profiles.map((profile) => (
                      <tr key={profile.id}>
                        <td className="px-4 py-4 text-slate-900">{profile.full_name}</td>
                        <td className="px-4 py-4 text-slate-600">{profile.email}</td>
                        <td className="px-4 py-4 text-slate-600">{profile.role}</td>
                        <td className="px-4 py-4 text-slate-600">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${profile.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {profile.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-4 space-x-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(profile)}
                            className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            {profile.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(profile)}
                            className="rounded-2xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OwnerAccountManager
