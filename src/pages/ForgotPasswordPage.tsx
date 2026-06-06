import { useState, type FormEvent } from 'react'
import { sendPasswordResetEmail } from '../lib/auth'

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      await sendPasswordResetEmail(email.trim())
      setMessage('Link reset password telah dikirim. Silakan periksa email Anda.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-orange-100 max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold text-slate-900">Lupa Password</h1>
      <p className="mt-2 text-orange-700">Masukkan email terdaftar untuk menerima tautan reset password.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-orange-200 bg-amber-50 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            placeholder="you@example.com"
          />
        </label>

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {loading ? 'Mengirim...' : 'Kirim Reset Password'}
        </button>
      </form>
    </section>
  )
}

export default ForgotPasswordPage
