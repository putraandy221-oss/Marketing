import { useState } from 'react'
import { signInWithEmail } from '../lib/auth'
import type { FormEvent } from 'react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // If already signed in, redirect to proper dashboard
  const redirectPath = (role: string) => {
    if (role === 'owner') return '/dashboard/owner'
    if (role === 'manager') return '/dashboard/manager'
    if (role === 'staff') return '/dashboard/staff'
    return '/login'
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { role, error: signInError } = await signInWithEmail(email, password)
      if (signInError) {
        setError(signInError)
        setLoading(false)
        return
      }
      if (!role) {
        setError('Peran pengguna tidak ditemukan. Pastikan profil sudah dibuat di database.')
        setLoading(false)
        return
      }
      window.location.href = redirectPath(role)
    } catch (err) {
      setError('Terjadi kesalahan saat login.')
      setLoading(false)
    }
  }

  return (
    <section className="rounded-3xl bg-white p-4 sm:p-8 shadow-2xl ring-1 ring-orange-100 max-w-lg mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Masuk ke FnB Management</h1>
      <p className="mt-2 text-orange-700">Masuk dengan email dan password Supabase.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-orange-900">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-orange-200 bg-amber-50 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-orange-900">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-orange-200 bg-amber-50 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            placeholder="••••••••"
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </section>
  )
}

export default LoginPage
