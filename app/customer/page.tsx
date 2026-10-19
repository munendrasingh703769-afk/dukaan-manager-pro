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
    <main className="min-h-screen bg-[#f4f7fb] pb-24 font-sans">
      
      {/* 🌟 Premium Header */}
      <header className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-b-[2.5rem] px-6 pt-12 pb-8 shadow-xl relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white text-xl font-black italic border border-white/30 shadow-inner">
              V
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">VyapaarSetu</h1>
              <p className="text-[10px] text-blue-100 font-medium tracking-wider uppercase">Customer App</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition">
            Logout
          </button>
        </div>

        {/* Welcome Message */}
        <div className="relative z-10 mt-4">
          <h2 className="text-2xl font-black text-white leading-tight">Namaste,<br/>Aaj kya khareedna hai?</h2>
          <p className="text-sm text-blue-100 mt-2 font-medium">Discover local shops & services near you.</p>
        </div>
      </header>

      <div className="px-5 -mt-6 relative z-20 space-y-6 max-w-md mx-auto">
        
        {/* 🔍 Floating Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 border border-gray-100 flex items-center p-2">
          <span className="text-gray-400 pl-3">🔍</span>
          <input type="text" placeholder="Search shops, products, services..." className="w-full bg-transparent outline-none text-sm p-3 text-gray-700 font-medium placeholder:text-gray-400" />
          <button className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl font-bold">Go</button>
        </div>

        {/* 📝 My Requests Link (Glass Style) */}
        <Link href="/customer/quotations" className="block bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl p-4 shadow-lg shadow-pink-500/20 active:scale-95 transition-all relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-7xl opacity-20">📝</div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-2xl border border-white/30">
                📋
              </div>
              <div>
                <p className="text-white font-bold text-base">My Estimate Requests</p>
                <p className="text-[11px] text-orange-50 font-medium mt-0.5">Check provider quotes & approve</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
              <span className="text-white text-lg font-bold">›</span>
            </div>
          </div>
        </Link>

        {/* 🛍️ Categories (Koteson) */}
        <section>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-lg font-black text-gray-800">Explore Categories</h2>
            <span className="text-xs font-bold text-indigo-600">See All</span>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {/* Category 1 */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center active:scale-95 transition">
              <div className="w-12 h-12 mx-auto bg-emerald-50 rounded-full flex items-center justify-center text-2xl mb-2">🛒</div>
              <p className="text-[11px] font-bold text-gray-700">Grocery</p>
            </div>
            {/* Category 2 */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center active:scale-95 transition">
              <div className="w-12 h-12 mx-auto bg-red-50 rounded-full flex items-center justify-center text-2xl mb-2">💊</div>
              <p className="text-[11px] font-bold text-gray-700">Medical</p>
            </div>
            {/* Category 3 */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center active:scale-95 transition">
              <div className="w-12 h-12 mx-auto bg-pink-50 rounded-full flex items-center justify-center text-2xl mb-2">👕</div>
              <p className="text-[11px] font-bold text-gray-700">Fashion</p>
            </div>
            {/* Category 4 */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center active:scale-95 transition">
              <div className="w-12 h-12 mx-auto bg-blue-50 rounded-full flex items-center justify-center text-2xl mb-2">🔧</div>
              <p className="text-[11px] font-bold text-gray-700">Services</p>
            </div>
          </div>
        </section>

        {/* 🔥 Featured / Banner */}
        <section className="mt-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
             <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-4xl shrink-0">
               🏪
             </div>
             <div>
               <h3 className="text-sm font-bold text-gray-900">Local Shops Coming Soon!</h3>
               <p className="text-[11px] text-gray-500 mt-1 leading-snug">Jald hi aap apne aas-paas ki dukaano se direct saman mangwa sakenge.</p>
             </div>
          </div>
        </section>

      </div>

      {/* 🌟 Premium Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-lg border-t border-gray-200 flex justify-around items-center pt-2 pb-6 px-2 z-50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
        
        <Link href="/customer" className="flex flex-col items-center gap-1 text-indigo-600">
          <div className="w-12 h-8 bg-indigo-50 rounded-full flex items-center justify-center">
            <span className="text-xl">🏠</span>
          </div>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        
        <Link href="/customer/explore" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition">
          <span className="text-xl">🧭</span>
          <span className="text-[10px] font-medium">Explore</span>
        </Link>
        
        <Link href="/customer/orders" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition">
          <span className="text-xl">📦</span>
          <span className="text-[10px] font-medium">Orders</span>
        </Link>
        
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600 transition">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>

      </nav>
    </main>
  )
}