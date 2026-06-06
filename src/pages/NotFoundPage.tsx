import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <section className="mx-auto max-w-xl rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-orange-100 text-center">
      <h1 className="text-4xl font-semibold text-slate-900">404</h1>
      <p className="mt-4 text-orange-700">Halaman tidak ditemukan.</p>
      <Link to="/" className="mt-6 inline-flex rounded-2xl bg-orange-600 px-5 py-3 text-white hover:bg-orange-700">
        Kembali ke beranda
      </Link>
    </section>
  )
}

export default NotFoundPage
