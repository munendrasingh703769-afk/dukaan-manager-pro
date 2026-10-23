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
  
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([]) 
  const [trialDays, setTrialDays] = useState(7)
  
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [modalType, setModalType] = useState<'sales' | 'udhaar' | 'stock' | 'profile' | 'scanner' | null>(null)
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

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

        const [ 
      { count: custCount }, 
      { count: prodCount }, 
      { data: salesData }, 
      { data: prodData }, 
      { data: recentSalesData },
      { data: reqData } 
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', activeId),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('business_id', activeId),
      supabase.from('sales').select('*').eq('business_id', activeId),
      supabase.from('products').select('id, name, stock_qty, low_stock_limit').eq('business_id', activeId),
      supabase.from('sales').select('id, invoice_no, total_amount, created_at').eq('business_id', activeId).order('created_at', { ascending: false }).limit(2),
      supabase.from('payment_requests').select('*, customers(name)').eq('business_id', activeId).eq('status', 'pending').order('created_at', { ascending: false })
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
    setRecentOrders(recentSalesData || [])
    
    setCounts({ 
      customers: custCount || 0, 
      products: prodCount || 0, 
      todaySales: todaySalesAmt, 
      totalUdhaar: totalUdhaarAmt, 
      lowStock: lowStockCount, 
      monthlyProfit: 0 
    })
    setLoading(false)
  }

  function handleBusinessSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value
    setCurrentBusinessId(newId)
    setCurrentBusiness(businesses.find(b => b.id === newId) || null)
    loadData() 
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><p className="animate-pulse text-indigo-600 font-bold">Loading Dashboard...</p></div>
  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 font-sans relative">
      
      {/* 🌟 PREMIUM BRAND HEADER */}
      <header className="bg-white/90 backdrop-blur-lg px-4 py-4 sticky top-0 z-20 border-b border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-xl flex items-center justify-center font-black italic text-xl shadow-lg shadow-emerald-500/30 border border-white/20">
              V
            </div>
            <div>
              <h1 className="text-[22px] font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 tracking-tighter leading-none">
                VyapaarSetu
              </h1>
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-[0.2em] mt-0.5">Owner Panel</p>
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            <select 
              value={currentBusiness?.id} 
              onChange={handleBusinessSwitch} 
              className="bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1.5 border-none outline-none max-w-[80px] truncate"
            >
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            
            <button onClick={() => alert('No new notifications')} className="relative w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full active:scale-95 transition">
              <span className="text-sm">🔔</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            
            <button onClick={() => setModalType('profile')} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center active:scale-95 transition text-sm">
              👤
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-6 max-w-md mx-auto">
        
        {/* Business Info Card */}
        {currentBusiness && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-4 items-center relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full pointer-events-none"></div>
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl shrink-0 border border-emerald-100">🏪</div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-900 text-sm truncate">{currentBusiness.name}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{currentBusiness.owner_name || 'Add Owner'}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">📍 {currentBusiness.city || 'Add Location'}</p>
            </div>
            <Link href="/settings/business" className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition z-10 relative">Edit</Link>
          </div>
        )}

        {/* Premium Trial Banner */}
        {trialDays > 0 && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-orange-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-6xl opacity-20">👑</div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-white text-sm border border-white/30">✨</div>
              <div>
                <p className="text-xs font-black text-white">Premium Trial</p>
                <p className="text-[10px] text-orange-100 font-medium">{trialDays} days remaining</p>
              </div>
            </div>
            <Link href="/pricing" className="bg-white text-orange-600 text-[10px] font-black px-4 py-2 rounded-xl shadow-sm active:scale-95 transition relative z-10">Upgrade</Link>
          </div>
        )}

        {/* Business Overview (KPIs) */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-black text-slate-800 tracking-tight">Business Overview</h2>
            <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">📅 Today</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            
            {/* Today's Sales - Dark Premium */}
            <div onClick={() => setModalType('sales')} className="bg-slate-900 rounded-2xl p-4 shadow-lg cursor-pointer active:scale-95 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</span>
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 text-xs">📈</div>
              </div>
              <p className="text-xl font-black text-white">₹{counts.todaySales.toLocaleString('en-IN')}</p>
            </div>

            {/* Total Udhaar - Light Premium */}
            <div onClick={() => setModalType('udhaar')} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 cursor-pointer active:scale-95 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Udhaar</span>
                <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 text-xs">👥</div>
              </div>
              <p className="text-xl font-black text-slate-800">₹{counts.totalUdhaar.toLocaleString('en-IN')}</p>
            </div>

            {/* Low Stock - Light Premium */}
            <div onClick={() => setModalType('stock')} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 cursor-pointer active:scale-95 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Low Stock</span>
                <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 text-xs">⚠️</div>
              </div>
              <p className="text-xl font-black text-slate-800">{counts.lowStock} <span className="text-xs text-slate-500 font-medium">Items</span></p>
            </div>

            {/* Profit - Indigo Premium */}
            <div className="bg-indigo-600 rounded-2xl p-4 shadow-lg shadow-indigo-200 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Net Profit</span>
                <Link href="/reports" className="text-[9px] font-black text-indigo-900 bg-white px-2 py-0.5 rounded shadow-sm">View</Link>
              </div>
              <p className="text-xl font-black text-white relative z-10">₹{counts.monthlyProfit}</p>
            </div>

          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/sales/new" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-slate-100 active:scale-95 transition">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm border border-emerald-100">🛒</div>
              <div>
                <p className="text-xs font-bold text-slate-800">New Sale</p>
                <p className="text-[9px] text-slate-500 font-medium">Create invoice</p>
              </div>
            </Link>
            
            <Link href="/purchases/new" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-slate-100 active:scale-95 transition">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm border border-blue-100">🚚</div>
              <div>
                <p className="text-xs font-bold text-slate-800">Product & Stock</p>
                <p className="text-[9px] text-slate-500 font-medium">Add inventory</p>
              </div>
            </Link>

            <Link href="/products" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-slate-100 active:scale-95 transition">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm border border-purple-100">📦</div>
              <div>
                <p className="text-xs font-bold text-slate-800">Add Product</p>
                <p className="text-[9px] text-slate-500 font-medium">New item</p>
              </div>
            </Link>

            <Link href="/customers" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-slate-100 active:scale-95 transition">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-sm border border-teal-100">👤</div>
              <div>
                <p className="text-xs font-bold text-slate-800">Add Customer</p>
                <p className="text-[9px] text-slate-500 font-medium">Register</p>
              </div>
            </Link>
            
            <Link href="/owner/quotations" className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-slate-100 active:scale-95 transition col-span-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-sm border border-orange-100">📝</div>
              <div>
                <p className="text-xs font-bold text-slate-800">Quotations / Estimates</p>
                <p className="text-[9px] text-slate-500 font-medium">Manage customer requests</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Premium Reports Banner */}
        <section>
          <Link href="/reports" className="bg-slate-900 rounded-2xl p-4 shadow-xl flex items-center justify-between active:scale-95 transition relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-lg backdrop-blur-md border border-white/10">📊</div>
              <div>
                <p className="text-sm font-black text-white">Reports & Analytics</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">View sales, purchases & edit entries</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center relative z-10 border border-white/10">
               <span className="text-white text-sm font-bold">→</span>
            </div>
          </Link>
        </section>

      </div>

      {/* Modals (Same Logic, Updated UI) */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center pb-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                {modalType === 'stock' ? "Low Stock Alerts" : modalType === 'profile' ? "My Profile" : "Details"}
              </h3>
              <button onClick={() => setModalType(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">&times;</button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {modalType === 'stock' && (
                lowStockItems.length === 0 ? <p className="text-sm text-slate-500 text-center py-6 font-medium">No items are low on stock.</p> : (
                  <div className="space-y-3">
                    {lowStockItems.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 text-lg">📦</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Alert Limit: {item.low_stock_limit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-rose-600">{item.stock_qty}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Left</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
              {modalType === 'profile' && (
                <div className="flex flex-col items-center py-4">
                  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-4 border border-slate-200">👤</div>
                  <label className="bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md">Upload Photo<input type="file" accept="image/*" className="hidden" onChange={() => alert('Photo upload coming soon!')} /></label>
                  <p className="text-base font-black text-slate-800 mt-5">{currentBusiness?.owner_name || 'Owner Name'}</p>
                  <p className="text-xs text-slate-500 font-medium">{currentBusiness?.phone || 'Phone'}</p>
                  <button onClick={() => router.push('/settings/business')} className="mt-6 text-xs font-bold text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl">Edit Business Details</button>
                </div>
              )}
              {modalType === 'scanner' && (
                <div className="flex flex-col gap-3">
                  <button onClick={() => { alert('Camera open ho raha hai...'); setModalType(null); }} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 active:bg-slate-100 transition"><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl">📸</div><div className="text-left"><p className="font-bold text-slate-800 text-sm">Bill Photo Scan</p><p className="text-[10px] text-slate-500">Auto-create Purchase entry</p></div></button>
                  <button onClick={() => { alert('QR Scanner open ho raha hai...'); setModalType(null); }} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 active:bg-slate-100 transition"><div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-2xl">🔳</div><div className="text-left"><p className="font-bold text-slate-800 text-sm">Scan QR Code</p><p className="text-[10px] text-slate-500">Scan product or customer QR</p></div></button>
                  <button onClick={() => { router.push('/purchases/new'); setModalType(null); }} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 active:bg-slate-100 transition"><div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-2xl">✍️</div><div className="text-left"><p className="font-bold text-slate-800 text-sm">Manual Entry</p><p className="text-[10px] text-slate-500">Enter details manually</p></div></button>
                </div>
              )}
              {(modalType === 'sales' || modalType === 'udhaar') && <p className="text-sm text-slate-500 text-center py-6 font-medium">Detailed breakdown coming soon.</p>}
            </div>
            <button onClick={() => setModalType(null)} className="w-full mt-6 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition">Close</button>
          </div>
        </div>
      )}

      {/* Premium Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center pt-2 pb-6 px-1 z-30 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
        <Link href="/owner" className="flex flex-col items-center gap-1 text-slate-900">
          <div className="w-12 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <span className="text-lg">🏠</span>
          </div>
          <span className="text-[9px] font-black">Home</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition">
          <span className="text-xl">🛒</span>
          <span className="text-[9px] font-bold">Orders</span>
        </Link>
        <button onClick={() => setModalType('scanner')} className="flex flex-col items-center justify-center bg-slate-900 text-white w-14 h-14 rounded-full -mt-6 shadow-xl border-[3px] border-white active:scale-95 transition">
          <span className="text-xl">📷</span>
        </button>
        <Link href="/sales" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition">
          <span className="text-xl">🧾</span>
          <span className="text-[9px] font-bold">Sales</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition">
          <span className="text-xl">⚙️</span>
          <span className="text-[9px] font-bold">Settings</span>
        </Link>
      </nav>

    </main>
  )
}