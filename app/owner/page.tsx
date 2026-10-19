'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, setCurrentBusinessId } from '@/lib/business'

type Business = { id: string; name: string; owner_name: string | null; phone: string | null; city: string | null; trial_start_date: string | null; }
type Counts = { customers: number; products: number; todaySales: number; totalUdhaar: number; lowStock: number; monthlyProfit: number; }

export default function OwnerDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null)
  const [counts, setCounts] = useState<Counts>({ customers: 0, products: 0, todaySales: 0, totalUdhaar: 0, lowStock: 0, monthlyProfit: 0 })
  const [lowStockItems, setLowStockItems] = useState<any[]>([]) 
  const [trialDays, setTrialDays] = useState(7)
  const [modalType, setModalType] = useState<'sales' | 'udhaar' | 'stock' | 'profile' | 'scanner' | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    // Data Leak Fix: Sirf apne business fetch honge
    const { data: bizData } = await supabase.from('businesses').select('*').eq('owner_id', user.id).order('created_at')
    if (!bizData || bizData.length === 0) return setLoading(false)

    setBusinesses(bizData)
    let activeId = getCurrentBusinessId() || bizData[0].id
    if (!bizData.find(b => b.id === activeId)) activeId = bizData[0].id
    setCurrentBusinessId(activeId)

    const activeBiz = bizData.find(b => b.id === activeId) || bizData[0]
    setCurrentBusiness(activeBiz)

    if (activeBiz.trial_start_date) {
      const diff = Math.ceil((new Date(activeBiz.trial_start_date).getTime() + (7 * 24 * 60 * 60 * 1000) - new Date().getTime()) / (1000 * 60 * 60 * 24))
      setTrialDays(diff > 0 ? diff : 0)
    } else { setTrialDays(7) }

    const [ { count: custCount }, { count: prodCount }, { data: salesData }, { data: prodData } ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', activeId),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('business_id', activeId),
      supabase.from('sales').select('*').eq('business_id', activeId),
      supabase.from('products').select('id, name, stock_qty, low_stock_limit').eq('business_id', activeId)
    ])

    let todaySalesAmt = 0, totalUdhaarAmt = 0
    const today = new Date().toISOString().split('T')[0]

    salesData?.forEach(s => {
      if (new Date(s.created_at).toISOString().split('T')[0] === today) todaySalesAmt += Number(s.total_amount)
      if (s.due_amount && Number(s.due_amount) > 0) totalUdhaarAmt += Number(s.due_amount)
    })

    let lowStockCount = 0, lowStockList: any[] = []
    prodData?.forEach(p => {
      if (p.stock_qty <= p.low_stock_limit) { lowStockCount++; lowStockList.push(p) }
    })

    setLowStockItems(lowStockList)
    setCounts({ customers: custCount || 0, products: prodCount || 0, todaySales: todaySalesAmt, totalUdhaar: totalUdhaarAmt, lowStock: lowStockCount, monthlyProfit: 0 })
    setLoading(false)
  }

  // 🔥 Smooth Business Switch (Page Reload hataya hai)
  function handleBusinessSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value
    setCurrentBusinessId(newId)
    setCurrentBusiness(businesses.find(b => b.id === newId) || null)
    loadData() // Sirf data refresh hoga
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="animate-pulse text-emerald-600 font-bold">Loading VyapaarSetu...</p></div>

  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans relative">
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <div className="text-3xl font-extrabold text-emerald-600 italic tracking-tighter">V</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">VyapaarSetu</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-wide">Owner Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={currentBusiness?.id} onChange={handleBusinessSwitch} className="bg-blue-50 text-blue-700 text-xs font-semibold rounded-full px-3 py-1.5 border-none outline-none max-w-[100px] truncate">
            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => setModalType('profile')} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">👤</button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-5 max-w-md mx-auto">
        {currentBusiness && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3">
            <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center text-3xl shrink-0">🏪</div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-base truncate">{currentBusiness.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Owner: {currentBusiness.owner_name || 'Add Owner'}</p>
              <p className="text-xs text-gray-500 mt-0.5">📍 {currentBusiness.city || 'Add Location'}</p>
            </div>
            <Link href="/settings/business" className="h-fit bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg">✏️ Edit</Link>
          </div>
        )}

        {trialDays > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2"><span className="text-xl">👑</span><div><p className="text-sm font-bold text-emerald-800">Trial: {trialDays} days left</p></div></div>
            <Link href="/pricing" className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Upgrade →</Link>
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Business Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <div onClick={() => setModalType('sales')} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 cursor-pointer">
              <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">📈</div><span className="text-xs font-medium text-gray-500">Today's Sales</span></div>
              <p className="text-lg font-bold text-gray-900">₹{counts.todaySales.toLocaleString('en-IN')}</p>
            </div>
            <div onClick={() => setModalType('udhaar')} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 cursor-pointer">
              <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">👥</div><span className="text-xs font-medium text-gray-500">Total Udhaar</span></div>
              <p className="text-lg font-bold text-gray-900">₹{counts.totalUdhaar.toLocaleString('en-IN')}</p>
            </div>
            <div onClick={() => setModalType('stock')} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 cursor-pointer">
              <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">⚠️</div><span className="text-xs font-medium text-gray-500">Low Stock</span></div>
              <p className="text-lg font-bold text-gray-900">{counts.lowStock} items</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">💼</div><span className="text-xs font-medium text-gray-500">Profit</span></div>
                 <Link href="/reports" className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">View</Link>
               </div>
               <p className="text-lg font-bold text-gray-900">₹{counts.monthlyProfit}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/sales/new" className="bg-emerald-50 rounded-xl p-3 flex items-center gap-2"><span className="text-lg">🛒</span><p className="text-sm font-bold text-emerald-900">New Sale</p></Link>
            <Link href="/purchases" className="bg-blue-50 rounded-xl p-3 flex items-center gap-2"><span className="text-lg">🚚</span><p className="text-sm font-bold text-blue-900">Product & Stock</p></Link>
          </div>
        </section>

        <section>
          <Link href="/reports" className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white text-2xl border border-white/30">📊</div>
              <div><p className="text-base font-bold text-white">Reports & Analytics</p></div>
            </div>
          </Link>
        </section>
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{modalType === 'stock' ? "Low Stock Items" : "Details"}</h3>
              <button onClick={() => setModalType(null)} className="text-2xl">&times;</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {modalType === 'stock' && lowStockItems.map((item, idx) => (
                <div key={idx} className="bg-red-50 p-3 rounded-xl mb-2 flex justify-between">
                  <p className="font-bold text-gray-800">{item.name}</p>
                  <p className="font-black text-red-600">{item.stock_qty} left</p>
                </div>
              ))}
              {modalType === 'profile' && (
                 <div className="text-center py-4">
                   <p className="font-bold">{currentBusiness?.owner_name}</p>
                   <p className="text-xs text-gray-500">{currentBusiness?.phone}</p>
                 </div>
              )}
            </div>
            <button onClick={() => setModalType(null)} className="w-full mt-4 bg-gray-100 font-bold py-3 rounded-xl">Close</button>
          </div>
        </div>
      )}

      {/* Bottom Nav - Link to existing pages kept intact */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-6 z-20">
        <Link href="/owner" className="flex flex-col items-center text-emerald-600"><span className="text-xl">🏠</span><span className="text-[10px] font-bold">Home</span></Link>
        <Link href="/orders" className="flex flex-col items-center text-gray-400"><span className="text-xl">🛒</span><span className="text-[10px]">Orders</span></Link>
        <button onClick={() => setModalType('scanner')} className="bg-blue-600 text-white w-14 h-14 rounded-full -mt-6 border-4 border-white shadow-lg flex items-center justify-center text-2xl">📷</button>
        <Link href="/sales" className="flex flex-col items-center text-gray-400"><span className="text-xl">🧾</span><span className="text-[10px]">Sales</span></Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400"><span className="text-xl">⚙️</span><span className="text-[10px]">Settings</span></Link>
      </nav>
    </main>
  )
}