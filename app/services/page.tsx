'use client'
import Link from 'next/link'

export default function ServicesDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Service Provider</h1>
        <p className="text-sm text-slate-500 mb-6">Aapka Service Dashboard ban raha hai. Jald hi yahan aapko aane wale orders dikhenge.</p>
        <Link href="/owner" className="block w-full bg-slate-900 text-white font-bold py-3 rounded-xl mb-3">Go to Main Panel</Link>
      </div>
    </main>
  )
}