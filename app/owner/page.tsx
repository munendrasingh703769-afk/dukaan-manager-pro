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

    const [ { count: custCount }, { count: prodCount }, { data: salesData }, { data: prodData }, { data: recentSalesData } ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', activeId),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('business_id', activeId),
      supabase.from('sales').select('*').eq('business_id', activeId),
      supabase.from('products').select('id, name, stock_qty, low_stock_limit').eq('business_id', activeId),
      supabase.from('sales').select('id, invoice_no, total_amount, created_at').eq('business_id', activeId).order('created_at', { ascending: false }).limit(2)
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="animate-pulse text-emerald-600 font-bold">Loading VyapaarSetu...</p></div>
  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans relative">
      
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="text-3xl font-extrabold text-emerald-600 italic tracking-tighter">V</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">VyapaarSetu</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-wide">Owner Panel</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-md">
            🌐 {lang === 'en' ? 'EN' : 'हि'}
          </button>
          <select value={currentBusiness?.id} onChange={handleBusinessSwitch} className="bg-blue-50 text-blue-700 text-xs font-semibold rounded-full px-3 py-1.5 border-none outline-none max-w-[100px] truncate">
            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => alert('No new notifications')} className="relative"><span className="text-xl">🔔</span></button>
          <button onClick={() => setModalType('profile')} className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center">👤</button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-5 max-w-md mx-auto">
        
        {currentBusiness && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3">
            <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center text-3xl shrink-0">🏪</div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-base truncate">{currentBusiness.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Owner: {currentBusiness.owner_name || 'Add Owner'}</p>
              <p className="text-xs text-gray-500 mt-0.5">📞 {currentBusiness.phone || 'Add Phone'}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {currentBusiness.city || 'Add Location'}</p>
            </div>
            <Link href="/settings/business" className="h-fit bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">✏️ Edit</Link>
          </div>
        )}

        {trialDays > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">👑</span>
              <div><p className="text-sm font-bold text-emerald-800">Trial: {trialDays} days left</p></div>
            </div>
            <Link href="/pricing" className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition">Upgrade →</Link>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2"><span className="text-blue-600 text-lg">🛒</span><h2 className="text-base font-bold text-gray-900">Recent Orders</h2></div>
            <Link href="/orders" className="text-xs font-bold text-blue-600">View All</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No Recent Orders</div>
            ) : (
              recentOrders.map((order, i) => (
                <div key={i} onClick={() => router.push(`/sales/${order.id}`)} className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.invoice_no}</p>
                    <p className="text-[10px] text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">₹{order.total_amount}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Business Overview</h2>
            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">📅 Today</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div onClick={() => setModalType('sales')} className="bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl p-3 shadow-md cursor-pointer active:scale-95 transition relative overflow-hidden">
              <div className="absolute -right-2 -bottom-2 text-5xl opacity-20">📈</div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">📈</div>
                <span className="text-[11px] font-semibold text-emerald-50">Today's Sales</span>
              </div>
              <p className="text-lg font-black text-white relative z-10">₹{counts.todaySales.toLocaleString('en-IN')}</p>
            </div>

            <div onClick={() => setModalType('udhaar')} className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-3 shadow-md cursor-pointer active:scale-95 transition relative overflow-hidden">
              <div className="absolute -right-2 -bottom-2 text-5xl opacity-20">👥</div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">👥</div>
                <span className="text-[11px] font-semibold text-purple-50">Total Udhaar</span>
              </div>
              <p className="text-lg font-black text-white relative z-10">₹{counts.totalUdhaar.toLocaleString('en-IN')}</p>
            </div>

            <div onClick={() => setModalType('stock')} className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-3 shadow-md cursor-pointer active:scale-95 transition relative overflow-hidden">
              <div className="absolute -right-2 -bottom-2 text-5xl opacity-20">⚠️</div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">⚠️</div>
                <span className="text-[11px] font-semibold text-orange-50">Low Stock</span>
              </div>
              <p className="text-lg font-black text-white relative z-10">{counts.lowStock} items</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-3 shadow-md relative overflow-hidden">
              <div className="absolute -right-2 -bottom-2 text-5xl opacity-20">💼</div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">💼</div>
                  <span className="text-[11px] font-semibold text-blue-50">Profit</span>
                </div>
                <Link href="/reports" className="text-[9px] font-bold text-blue-900 bg-white px-1.5 py-0.5 rounded shadow-sm">View</Link>
              </div>
              <p className="text-lg font-black text-white relative z-10">₹{counts.monthlyProfit}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/sales/new" className="bg-emerald-50 rounded-xl p-3 flex items-center gap-2 active:scale-95 transition border border-emerald-100">
              <span className="text-lg">🛒</span><div><p className="text-sm font-bold text-emerald-900">New Sale</p><p className="text-[10px] text-emerald-700">Create invoice</p></div>
            </Link>
            <Link href="/purchases" className="bg-blue-50 rounded-xl p-3 flex items-center gap-2 active:scale-95 transition border border-blue-100">
              <span className="text-lg">🚚</span><div><p className="text-sm font-bold text-blue-900">Product & Stock</p><p className="text-[10px] text-blue-700">Add stock</p></div>
            </Link>
            <Link href="/products" className="bg-purple-50 rounded-xl p-3 flex items-center gap-2 active:scale-95 transition border border-purple-100">
              <span className="text-lg">📦</span><div><p className="text-sm font-bold text-purple-900">Add Product</p><p className="text-[10px] text-purple-700">New item</p></div>
            </Link>
            <Link href="/customers" className="bg-teal-50 rounded-xl p-3 flex items-center gap-2 active:scale-95 transition border border-teal-100">
              <span className="text-lg">👤</span><div><p className="text-sm font-bold text-teal-900">Add Customer</p><p className="text-[10px] text-teal-700">Register</p></div>
            </Link>
            
            <Link href="/owner/quotations" className="bg-orange-50 rounded-xl p-3 flex items-center gap-2 active:scale-95 transition border border-orange-100">
              <span className="text-lg">📝</span>
              <div><p className="text-sm font-bold text-orange-900">Quotations</p><p className="text-[10px] text-orange-700">Customer requests</p></div>
            </Link>

          </div>
        </section>

        <section>
          <Link href="/reports" className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg flex items-center justify-between active:scale-95 transition relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20 text-8xl">📊</div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl shadow-inner border border-white/30">📊</div>
              <div><p className="text-base font-bold text-white tracking-wide">Reports & Analytics</p><p className="text-xs text-indigo-100 font-medium">View sales, purchases, and edit entries</p></div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center relative z-10 border border-white/20"><span className="text-white text-lg font-bold">›</span></div>
          </Link>
        </section>

        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-lg">E-Commerce Store 🛍️</h3>
            <p className="text-xs text-purple-100 mt-1">Sell your products online. Create your digital shop.</p>
            <span className="inline-block mt-2 bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/30 backdrop-blur-sm">Coming Soon</span>
          </div>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center pb-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {modalType === 'stock' ? "Low Stock Items" : modalType === 'profile' ? "My Profile" : "Details"}
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {modalType === 'stock' && (
                lowStockItems.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No low stock items.</p> : (
                  <div className="space-y-3">
                    {lowStockItems.map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-red-100 flex items-center justify-between">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">📦</div><div><p className="text-sm font-bold text-gray-900">{item.name}</p><p className="text-xs text-gray-500 mt-0.5">Limit: {item.low_stock_limit}</p></div></div>
                        <div className="text-right"><p className="text-lg font-black text-red-600">{item.stock_qty}</p><p className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Left</p></div>
                      </div>
                    ))}
                  </div>
                )
              )}
              {modalType === 'profile' && (
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-4xl mb-4">👤</div>
                  <label className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg cursor-pointer">Upload Photo<input type="file" accept="image/*" className="hidden" onChange={() => alert('Photo upload coming soon!')} /></label>
                  <p className="text-sm font-bold text-gray-800 mt-4">{currentBusiness?.owner_name || 'Owner Name'}</p>
                  <p className="text-xs text-gray-500">{currentBusiness?.phone || 'Phone'}</p>
                  <button onClick={() => router.push('/settings/business')} className="mt-4 text-blue-600 text-sm font-semibold">Edit Business Details</button>
                </div>
              )}
              {modalType === 'scanner' && (
                <div className="flex flex-col gap-3">
                  <button onClick={() => { alert('Camera open ho raha hai...'); setModalType(null); }} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 active:bg-gray-100"><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl">📸</div><div className="text-left"><p className="font-bold text-gray-900">Bill Photo Scan</p><p className="text-xs text-gray-500">Take photo to auto-create Purchase entry</p></div></button>
                  <button onClick={() => { alert('QR Scanner open ho raha hai...'); setModalType(null); }} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 active:bg-gray-100"><div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl">🔳</div><div className="text-left"><p className="font-bold text-gray-900">Scan QR Code</p><p className="text-xs text-gray-500">Scan product or customer QR</p></div></button>
                  <button onClick={() => { router.push('/purchases'); setModalType(null); }} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 active:bg-gray-100"><div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl">✍️</div><div className="text-left"><p className="font-bold text-gray-900">Manual / Custom Entry</p><p className="text-xs text-gray-500">Enter details manually</p></div></button>
                </div>
              )}
              {(modalType === 'sales' || modalType === 'udhaar') && <p className="text-sm text-gray-500 text-center py-4">Details will appear here.</p>}
            </div>
            <button onClick={() => setModalType(null)} className="w-full mt-5 bg-gray-100 text-gray-800 font-bold py-3 rounded-xl">Close</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-6 px-1 z-20">
        <Link href="/owner" className="flex flex-col items-center gap-1 text-emerald-600"><span className="text-xl">🏠</span><span className="text-[10px] font-bold">Home</span></Link>
        <Link href="/orders" className="relative flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-600"><span className="text-xl">🛒</span><span className="text-[10px] font-medium">Orders</span></Link>
        <button onClick={() => setModalType('scanner')} className="flex flex-col items-center justify-center bg-blue-600 text-white w-14 h-14 rounded-full -mt-6 shadow-lg border-4 border-white"><span className="text-2xl">📷</span></button>
        <Link href="/sales" className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-600"><span className="text-xl">🧾</span><span className="text-[10px] font-medium">Sales</span></Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-600"><span className="text-xl">⚙️</span><span className="text-[10px] font-medium">Settings</span></Link>
      </nav>

    </main>
  )
}