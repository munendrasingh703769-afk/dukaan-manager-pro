'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SellerEarningsPage() {
  const supabase = createClient()
  
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCommission: 0,
    netPayout: 0,
    pendingOrders: 0
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        fetchEarnings(user.id)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchEarnings(userId: string) {
    setLoading(true)
    
    // Fetch order items for this seller, including the order status and commission ledger
    const { data, error } = await supabase
      .from('marketplace_order_items')
      .select(`
        id, quantity, unit_price, status, created_at,
        marketplace_orders ( id, total_amount, status, created_at ),
        marketplace_listings ( title, image_urls ),
        seller_commission_ledger ( commission_amount, status )
      `)
      .eq('seller_user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setOrders(data)
      
      // Calculate Stats dynamically
      let tSales = 0
      let tComm = 0
      let net = 0
      let pending = 0

      data.forEach((item: any) => {
        const orderTotal = item.unit_price * item.quantity
        const commAmount = item.seller_commission_ledger?.[0]?.commission_amount || 0
        
        // Sirf delivered ya paid orders ko count karo sales me
        if (item.status === 'delivered' || item.status === 'shipped' || item.status === 'paid') {
          tSales += orderTotal
          tComm += commAmount
          net += (orderTotal - commAmount)
        }
        
        if (item.status === 'pending') {
          pending += 1
        }
      })

      setStats({
        totalSales: tSales,
        totalCommission: tComm,
        netPayout: net,
        pendingOrders: pending
      })
    }
    setLoading(false)
  }

  if (!user && !loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-600">Please login to view earnings.</p></div>
  }

  // ... (UI Part will come in next message)
  // ... (Part 1 ka code yahan khatam hua hoga)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
          <p className="text-sm text-gray-500">Track your sales, platform commission, and net earnings.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Sales (Gross)</p>
            <p className="text-2xl font-bold text-gray-900">₹{loading ? '...' : stats.totalSales.toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100 bg-red-50/30">
            <p className="text-xs text-red-600 font-medium uppercase tracking-wider mb-1">Platform Commission</p>
            <p className="text-2xl font-bold text-red-700">- ₹{loading ? '...' : stats.totalCommission.toFixed(2)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 bg-green-50/30">
            <p className="text-xs text-green-600 font-medium uppercase tracking-wider mb-1">Net Payout</p>
            <p className="text-2xl font-bold text-green-700">₹{loading ? '...' : stats.netPayout.toFixed(2)}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-yellow-100 bg-yellow-50/30">
            <p className="text-xs text-yellow-600 font-medium uppercase tracking-wider mb-1">Pending Orders</p>
            <p className="text-2xl font-bold text-yellow-700">{loading ? '...' : stats.pendingOrders}</p>
          </div>
          
        </div>

        {/* Earnings History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Order History & Earnings</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="p-4 font-medium">Order Details</th>
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium text-right">Gross Amount</th>
                  <th className="p-4 font-medium text-right">Commission</th>
                  <th className="p-4 font-medium text-right">Net Earnings</th>
                  <th className="p-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading earnings...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No orders found.</td></tr>
                ) : (
                  orders.map((item: any) => {
                    const gross = item.unit_price * item.quantity;
                    const comm = item.seller_commission_ledger?.[0]?.commission_amount || 0;
                    const net = gross - comm;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="p-4">
                          <p className="text-sm font-bold text-gray-900">#{item.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {item.marketplace_listings?.image_urls?.[0] ? (
                                <img src={item.marketplace_listings.image_urls[0]} alt="product" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-gray-400 text-xs">📦</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.marketplace_listings?.title}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-medium text-gray-800">₹{gross.toFixed(2)}</td>
                        <td className="p-4 text-right font-medium text-red-600">- ₹{comm.toFixed(2)}</td>
                        <td className="p-4 text-right font-bold text-green-600">₹{net.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}