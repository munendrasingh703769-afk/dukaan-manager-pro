'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerHome() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <div className="text-2xl font-extrabold text-blue-600 italic">V</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">VyapaarSetu</h1>
            <p className="text-[10px] text-gray-500">Customer App</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Logout</button>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
          <span className="text-gray-400 pl-2">🔍</span>
          <input type="text" placeholder="Search shops, products..." className="w-full bg-transparent outline-none text-sm p-2" />
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
          <h2 className="text-xl font-bold mb-1">Welcome!</h2>
          <p className="text-xs text-blue-100">Order from your favourite local shops.</p>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mt-6">Categories (Koteson)</h2>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><span className="text-2xl">🛒</span><p className="text-[10px] font-bold mt-1 text-gray-700">Grocery</p></div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><span className="text-2xl">💊</span><p className="text-[10px] font-bold mt-1 text-gray-700">Medical</p></div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><span className="text-2xl">👕</span><p className="text-[10px] font-bold mt-1 text-gray-700">Fashion</p></div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><span className="text-2xl">🛠️</span><p className="text-[10px] font-bold mt-1 text-gray-700">Services</p></div>
        </div>
      </div>

      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-6 z-20">
        <Link href="/customer" className="flex flex-col items-center text-blue-600"><span className="text-xl">🏠</span><span className="text-[10px] font-bold">Home</span></Link>
        <Link href="/customer/explore" className="flex flex-col items-center text-gray-400"><span className="text-xl">🧭</span><span className="text-[10px]">Explore</span></Link>
        <Link href="/customer/orders" className="flex flex-col items-center text-gray-400"><span className="text-xl">📦</span><span className="text-[10px]">Orders</span></Link>
        <Link href="/customer/profile" className="flex flex-col items-center text-gray-400"><span className="text-xl">👤</span><span className="text-[10px]">Profile</span></Link>
      </nav>
    </main>
  )
}