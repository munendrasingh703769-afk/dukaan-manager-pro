'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, setCurrentBusinessId } from '@/lib/business'

type Business = {
  id: string
  name: string
  owner_name: string | null
  phone: string | null
  city: string | null
  state: string | null
  trial_start_date: string | null
}

type Counts = {
  todaySales: number
  totalUdhaar: number
  lowStock: number
  monthlyProfit: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null)
  const [counts, setCounts] = useState<Counts>({
    todaySales: 0, totalUdhaar: 0, lowStock: 0, monthlyProfit: 0
  })
  const [trialDays, setTrialDays] = useState(7)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    // 🔒 Data Leak Fix: .eq('owner_id', user.id)
    const { data: bizData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id) 
      .order('created_at')

    if (!bizData || bizData.length === 0) {
      setLoading(false)
      return
    }

    setBusinesses(bizData)
    let activeId = getCurrentBusinessId() || bizData[0].id
    if (!bizData.find(b => b.id === activeId)) activeId = bizData[0].id
    
    setCurrentBusinessId(activeId)
    const activeBiz = bizData.find(b => b.id === activeId) || bizData[0]
    setCurrentBusiness(activeBiz)

    if (activeBiz.trial_start_date) {
      const start = new Date(activeBiz.trial_start_date).getTime()
      const diff = Math.ceil((start + (7 * 24 * 60 * 60 * 1000) - new Date().getTime()) / (1000 * 60 * 60 * 24))
      setTrialDays(diff > 0 ? diff : 0)
    }

    const [
      { data: salesData },
      { data: prodData }
    ] = await Promise.all([
      supabase.from('sales').select('total_amount, due_amount, created_at').eq('business_id', activeId),
      supabase.from('products').select('stock_qty, low_stock_limit').eq('business_id', activeId)
    ])

    let todaySalesAmt = 0, totalUdhaarAmt = 0, lowStockCount = 0
    const today = new Date().toISOString().split('T')[0]

    salesData?.forEach(s => {
      if (new Date(s.created_at).toISOString().split('T')[0] === today) todaySalesAmt += Number(s.total_amount)
      if (s.due_amount && Number(s.due_amount) > 0) totalUdhaarAmt += Number(s.due_amount)
    })

    prodData?.forEach(p => {
      if (p.stock_qty <= p.low_stock_limit) lowStockCount++
    })

    setCounts({
      todaySales: todaySalesAmt,
      totalUdhaar: totalUdhaarAmt,
      lowStock: lowStockCount,
      monthlyProfit: todaySalesAmt * 0.2 // Placeholder profit
    })
    setLoading(false)
  }

  function handleBusinessSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    setCurrentBusinessId(e.target.value)
    window.location.reload()
  }

  if (loading) return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500 animate-pulse">Loading VyapaarSetu...</p></main>
  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-24 font-sans">
      
      {/* HEADER */}
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl italic shadow-sm">V</div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 leading-tight">VyapaarSetu</h1>
            <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">Owner Panel</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={currentBusiness?.id} 
            onChange={handleBusinessSwitch}
            className="bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg px-2 py-1 outline-none max-w-[100px] truncate"
          >
            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          
          <div className="relative">
            <span className="text-2xl">🔔</span>
            <span className="absolute top-0 right-0 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-white"></span>
          </div>
          
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6 max-w-md mx-auto">
        
        {/* BUSINESS INFO CARD */}
        {currentBusiness && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3">
            <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center text-3xl shrink-0">🏪</div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-base truncate">{currentBusiness.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Owner: {currentBusiness.owner_name || 'Add Owner'}</p>
              <p className="text-xs text-gray-500 mt-0.5">📞 {currentBusiness.phone || 'Add Phone'}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {currentBusiness.city || 'Add Location'}</p>
            </div>
            <Link href="/settings/business" className="h-fit bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
              ✏️ Edit
            </Link>
          </div>
        )}

        {/* TRIAL BANNER */}
        {trialDays > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">👑</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">Trial: {trialDays} days left</p>
                <p className="text-[10px] text-emerald-600">Explore premium features</p>
              </div>
            </div>
            <button className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">Upgrade →</button>
          </div>
        )}

        {/* BUSINESS OVERVIEW */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Business Overview</h2>
            <div className="bg-white px-3 py-1 rounded-full border border-gray-200 flex items-center gap-1 shadow-sm">
              <span className="text-sm">📅</span>
              <span className="text-xs font-bold text-gray-700">today</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1A1D21] rounded-2xl p-4 shadow-lg flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider">TODAY'S SALES</span>
                <span className="bg-white/10 p-1.5 rounded-md text-sm">📈</span>
              </div>
              <p className="text-2xl font-bold text-white mt-2">₹{counts.todaySales.toLocaleString('en-IN')}</p>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider">TOTAL UDHAAR</span>
                <span className="bg-pink-50 p-1.5 rounded-md text-sm">👥</span>
              </div>
              <p className="text-2xl font-bold text-red-500 mt-2">₹{counts.totalUdhaar.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider">LOW STOCK</span>
                <span className="bg-amber-50 p-1.5 rounded-md text-sm">⚠️</span>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <p className="text-2xl font-bold text-gray-900">{counts.lowStock}</p>
                <span className="text-xs text-gray-500 font-medium">Items</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-4 shadow-lg flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-white/80 tracking-wider">NET PROFIT</span>
                <span className="bg-white/20 px-2 py-1 rounded-md text-[10px] font-bold text-white">View</span>
              </div>
              <p className="text-2xl font-bold text-white mt-2">₹{counts.monthlyProfit.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 mt-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/sales" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🛒</div>
              <div><p className="text-sm font-bold text-gray-900">New Sale</p></div>
            </Link>
            <Link href="/products" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl">📦</div>
              <div><p className="text-sm font-bold text-gray-900">Product & Stock</p></div>
            </Link>
            <Link href="/products" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">📦</div>
              <div><p className="text-sm font-bold text-gray-900">Add Product</p></div>
            </Link>
            <Link href="/customers" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl">👤</div>
              <div><p className="text-sm font-bold text-gray-900">Add Customer</p></div>
            </Link>
          </div>
        </section>

        {/* BUSINESS MODULES */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 mt-6">Business Modules</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/purchases" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">🛍️</div>
              <div><p className="text-xs font-bold text-gray-900">Purchases</p></div>
            </Link>
            <Link href="/customers" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">👥</div>
              <div><p className="text-xs font-bold text-gray-900">Customers</p></div>
            </Link>
            <Link href="/suppliers" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">🚚</div>
              <div><p className="text-xs font-bold text-gray-900">Suppliers</p></div>
            </Link>
            <Link href="/customers" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">💰</div>
              <div><p className="text-xs font-bold text-gray-900">Udhaar & Pay</p></div>
            </Link>
            <Link href="/expenses" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">💸</div>
              <div><p className="text-xs font-bold text-gray-900">Expenses</p></div>
            </Link>
            <Link href="/reports" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">📊</div>
              <div><p className="text-xs font-bold text-gray-900">Reports & GST</p></div>
            </Link>
            <Link href="/settings/workers" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">🛡️</div>
              <div><p className="text-xs font-bold text-gray-900">Staff & Perms</p></div>
            </Link>
          </div>
        </section>

        {/* MORE FEATURES */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 mt-6">More Features</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/reports/analysis" className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1 text-center py-3">
              <span className="text-xl">📈</span>
              <span className="text-[10px] font-bold text-gray-900 leading-tight">Reports<br/>Analysis</span>
            </Link>
            <Link href="/ecommerce" className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1 text-center py-3">
              <span className="text-xl">🌐</span>
              <span className="text-[10px] font-bold text-gray-900 leading-tight">E-<br/>commerce</span>
            </Link>
            <Link href="/quotations" className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-1 text-center py-3">
              <span className="text-xl">📝</span>
              <span className="text-[10px] font-bold text-gray-900 leading-tight">Quotation</span>
            </Link>
          </div>
        </section>

      </div>

      {/* BOTTOM NAV WITH CAMERA BUTTON */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-between items-center px-4 pb-6 pt-2 z-20">
        <Link href="/" className="flex flex-col items-center gap-1 text-emerald-600">
          <span className="text-2xl">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        
        <Link href="/orders" className="relative flex flex-col items-center gap-1 text-gray-400">
           <span className="text-2xl">🛒</span>
           <span className="text-[10px] font-medium">Orders</span>
        </Link>

        {/* Center Floating Camera Button */}
        <div className="relative -top-6">
          <button className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shadow-lg border-4 border-white active:scale-95 transition-transform">
            <span className="text-2xl text-white">📸</span>
          </button>
        </div>

        <Link href="/sales" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">🧾</span>
          <span className="text-[10px] font-medium">Sales</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">⚙️</span>
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
      </nav>

    </main>
  )
}