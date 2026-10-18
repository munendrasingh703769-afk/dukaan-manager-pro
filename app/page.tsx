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
  address: string | null
  city: string | null
  state: string | null
  business_code: string | null
  trial_start_date: string | null
}

type Counts = {
  customers: number
  products: number
  purchases: number
  sales: number
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
    customers: 0, products: 0, purchases: 0, sales: 0,
    todaySales: 0, totalUdhaar: 0, lowStock: 0, monthlyProfit: 0
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([]) // Real orders ke liye khali array
  const [trialDays, setTrialDays] = useState(7)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    // 🔥 FIX: Yahan .eq('owner_id', user.id) lagaya hai taaki dusre ka data na aaye
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
    let activeId = getCurrentBusinessId()
    if (!activeId || !bizData.find(b => b.id === activeId)) {
      activeId = bizData[0].id
      setCurrentBusinessId(activeId!)
    }

    const activeBiz = bizData.find(b => b.id === activeId) || bizData[0]
    setCurrentBusiness(activeBiz)

    if (activeBiz.trial_start_date) {
      const start = new Date(activeBiz.trial_start_date).getTime()
      const now = new Date().getTime()
      const diff = Math.ceil((start + (7 * 24 * 60 * 60 * 1000) - now) / (1000 * 60 * 60 * 24))
      setTrialDays(diff > 0 ? diff : 0)
    }

    const [
      { count: custCount },
      { count: prodCount },
      { data: salesData },
      { data: prodData },
      { data: recentSales },
      { data: recentPurchases }
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', activeId),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('business_id', activeId),
      supabase.from('sales').select('*').eq('business_id', activeId),
      supabase.from('products').select('stock_qty, low_stock_limit').eq('business_id', activeId),
      supabase.from('sales').select('id, invoice_no, total_amount, created_at, payment_method').eq('business_id', activeId).order('created_at', { ascending: false }).limit(2),
      supabase.from('purchases').select('id, invoice_no, total_amount, created_at').eq('business_id', activeId).order('created_at', { ascending: false }).limit(1)
    ])

    let todaySalesAmt = 0
    let totalUdhaarAmt = 0
    const today = new Date().toISOString().split('T')[0]

    salesData?.forEach(s => {
      const saleDate = new Date(s.created_at).toISOString().split('T')[0]
      if (saleDate === today) todaySalesAmt += Number(s.total_amount)
      if (s.due_amount && Number(s.due_amount) > 0) totalUdhaarAmt += Number(s.due_amount)
    })

    let lowStockCount = 0
    prodData?.forEach(p => {
      if (p.stock_qty <= p.low_stock_limit) lowStockCount++
    })

    setCounts({
      customers: custCount || 0,
      products: prodCount || 0,
      purchases: 0,
      sales: salesData?.length || 0,
      todaySales: todaySalesAmt,
      totalUdhaar: totalUdhaarAmt,
      lowStock: lowStockCount,
      monthlyProfit: 24800
    })

    let activities: any[] = []
    recentSales?.forEach(s => activities.push({ type: 'sale', title: `Invoice #${s.invoice_no}`, amount: s.total_amount, date: s.created_at, status: s.payment_method === 'cash' ? 'Paid' : 'Credit' }))
    recentPurchases?.forEach(p => activities.push({ type: 'purchase', title: `Purchase #${p.invoice_no}`, amount: p.total_amount, date: p.created_at, status: 'Completed' }))
    
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setRecentActivity(activities.slice(0, 3))

    setLoading(false)
  }

  function handleBusinessSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value
    setCurrentBusinessId(newId)
    setCurrentBusiness(businesses.find(b => b.id === newId) || null)
    window.location.reload()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading VyapaarSetu...</p>
      </main>
    )
  }
  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <div className="text-3xl font-extrabold text-emerald-600 italic tracking-tighter">V</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">VyapaarSetu</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-wide">Local Shops • Better Tomorrow</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={currentBusiness?.id} 
            onChange={handleBusinessSwitch}
            className="bg-blue-50 text-blue-700 text-xs font-semibold rounded-full px-3 py-1.5 border-none outline-none max-w-[140px] truncate"
          >
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          
          {/* 🔥 FIX: Notification Click */}
          <button onClick={() => alert('Notifications coming soon!')} className="relative">
            <span className="text-xl">🔔</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">3</span>
          </button>
          
          {/* 🔥 FIX: Profile Click */}
          <button onClick={() => router.push('/settings/business')} className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center">
            👤
          </button>
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
            <Link href="/settings/business" className="h-fit bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
              ✏️ Edit
            </Link>
          </div>
        )}

        {trialDays > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">👑</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">Trial: {trialDays} days left</p>
                <p className="text-[10px] text-emerald-600">Explore premium features</p>
              </div>
            </div>
            {/* 🔥 FIX: Upgrade Click */}
            <button onClick={() => alert('Upgrade page coming soon!')} className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">Upgrade →</button>
          </div>
        )}

        {/* 🔥 FIX: Recent Orders Section */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-lg">🛒</span>
              <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            </div>
            <Link href="/orders" className="text-xs font-bold text-blue-600">View All</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No Recent Orders
              </div>
            ) : (
              recentOrders.map((order, i) => (
                <div key={i} onClick={() => router.push(`/orders/${order.id}`)} className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                   {/* Future Order Data */}
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Business Overview</h2>
            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">📅 Today</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            
            {/* 🔥 FIX: Overview Boxes Clickable */}
            <Link href="/sales" className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-95 transition">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">📈</div>
                <span className="text-xs font-medium text-gray-500">Today's Sales</span>
              </div>
              <p className="text-lg font-bold text-gray-900">₹{counts.todaySales.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-600 mt-1">View Details →</p>
            </Link>
            
            <Link href="/customers" className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-95 transition">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">👥</div>
                <span className="text-xs font-medium text-gray-500">Total Udhaar</span>
              </div>
              <p className="text-lg font-bold text-gray-900">₹{counts.totalUdhaar.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-500 mt-1">👤 {counts.customers} customers</p>
            </Link>

            <Link href="/products" className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-95 transition">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">⚠️</div>
                <span className="text-xs font-medium text-gray-500">Low Stock</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{counts.lowStock} items</p>
              <p className="text-[10px] text-orange-500 mt-1">Need attention</p>
            </Link>

            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">💼</div>
                  <span className="text-xs font-medium text-gray-500">Monthly Profit</span>
                </div>
                <Link href="/reports" className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">View</Link>
              </div>
              <p className="text-lg font-bold text-gray-900">₹{counts.monthlyProfit.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-600 mt-1">Top product will show here</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/sales" className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <div>
                  <p className="text-sm font-bold text-emerald-900">New Sale</p>
                  <p className="text-[10px] text-emerald-700">Create invoice</p>
                </div>
              </div>
              <span className="text-emerald-500">›</span>
            </Link>

            <Link href="/purchases" className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚚</span>
                <div>
                  <p className="text-sm font-bold text-blue-900">Add Purchase</p>
                  <p className="text-[10px] text-blue-700">From supplier</p>
                </div>
              </div>
              <span className="text-blue-500">›</span>
            </Link>

            <Link href="/products" className="bg-purple-50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <div>
                  <p className="text-sm font-bold text-purple-900">Add Product</p>
                  <p className="text-[10px] text-purple-700">New item</p>
                </div>
              </div>
              <span className="text-purple-500">›</span>
            </Link>

            <Link href="/customers" className="bg-teal-50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <div>
                  <p className="text-sm font-bold text-teal-900">Add Customer</p>
                  <p className="text-[10px] text-teal-700">Register</p>
                </div>
              </div>
              <span className="text-teal-500">›</span>
            </Link>
          </div>
        </section>

        {/* E-commerce Coming Soon Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-lg">E-Commerce Store 🛍️</h3>
            <p className="text-xs text-purple-100 mt-1">Sell your products online. Create your digital shop.</p>
            <span className="inline-block mt-2 bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/30 backdrop-blur-sm">
              Coming Soon
            </span>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Business Modules</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/sales" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">📄</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Sales & Invoices</p>
                <p className="text-[9px] text-gray-500">Manage bills</p>
              </div>
            </Link>

            <Link href="/products" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">📦</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Products & Stock</p>
                <p className="text-[9px] text-gray-500">Inventory</p>
              </div>
            </Link>

            <Link href="/purchases" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">🛍️</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Purchases</p>
                <p className="text-[9px] text-gray-500">From suppliers</p>
              </div>
            </Link>

            <Link href="/customers" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">👥</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Customers</p>
                <p className="text-[9px] text-gray-500">Manage CRM</p>
              </div>
            </Link>

            <Link href="/suppliers" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">🚚</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Suppliers</p>
                <p className="text-[9px] text-gray-500">Vendors</p>
              </div>
            </Link>

            <Link href="/customers" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">💰</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Udhaar & Pay</p>
                <p className="text-[9px] text-gray-500">Track dues</p>
              </div>
            </Link>

            <Link href="/expenses" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">💸</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Expenses</p>
                <p className="text-[9px] text-gray-500">Manage costs</p>
              </div>
            </Link>

            <Link href="/reports" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">📊</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Reports & GST</p>
                <p className="text-[9px] text-gray-500">Tax returns</p>
              </div>
            </Link>

            <Link href="/settings/workers" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600">🛡️</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Staff & Perms</p>
                <p className="text-[9px] text-gray-500">Staff access</p>
              </div>
            </Link>

            <Link href="/settings" className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">⚙️</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Biz Settings</p>
                <p className="text-[9px] text-gray-500">Configuration</p>
              </div>
            </Link>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Recent Local Activity</h2>
            <Link href="/sales" className="text-xs font-bold text-emerald-600">View All →</Link>
          </div>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 bg-white rounded-xl border border-gray-100">No recent local activity</p>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${act.type === 'sale' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {act.type === 'sale' ? '📄' : '🚚'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{act.title}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{act.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₹{act.amount}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${act.status === 'Paid' || act.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{act.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-6 px-1 z-20">
        <Link href="/" className="flex flex-col items-center gap-1 text-emerald-600">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        
        <Link href="/orders" className="relative flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-600">
          <div className="relative">
             <span className="text-xl">🛒</span>
             {/* Notification Badge (Hardcoded for now) */}
             <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
               2
             </span>
          </div>
          <span className="text-[10px] font-medium">Orders</span>
        </Link>

        <Link href="/sales" className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-600">
          <span className="text-xl">🧾</span>
          <span className="text-[10px] font-medium">Sales</span>
        </Link>
        <Link href="/reports" className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-600">
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-medium">Reports</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-600">
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
      </nav>

    </main>
  )
}