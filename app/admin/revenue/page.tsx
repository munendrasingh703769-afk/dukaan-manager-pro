'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminRevenuePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  
  // Stats State
  const [stats, setStats] = useState({
    totalClicks: 0,
    affiliateOrders: 0,
    pendingCommission: 0,
    approvedCommission: 0,
    internalOrders: 0,
    internalRevenue: 0
  })

  // Recent Orders State
  const [recentAffiliateOrders, setRecentAffiliateOrders] = useState<any[]>([])
  const [recentInternalOrders, setRecentInternalOrders] = useState<any[]>([])

  useEffect(() => {
    fetchAdminStats()
  }, [])

  async function fetchAdminStats() {
    setLoading(true)

    try {
      // 1. Fetch Affiliate Clicks Count
      const { count: clickCount } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })

      // 2. Fetch Affiliate Orders (Commissions)
      const { data: affOrders } = await supabase
        .from('affiliate_orders')
        .select('commission_amount, status, created_at, external_order_ref, affiliate_partners(name)')
        .order('created_at', { ascending: false })
        .limit(10)

      // 3. Fetch Internal Marketplace Orders (Revenue)
      const { data: intOrders } = await supabase
        .from('marketplace_orders')
        .select('total_amount, status, created_at, id')
        .order('created_at', { ascending: false })
        .limit(10)

      // 4. Calculate Affiliate Totals
      let pendingComm = 0
      let approvedComm = 0
      let totalAffOrders = 0

      // Fetch ALL affiliate orders for accurate stats (not just recent 10)
      const { data: allAffOrders } = await supabase.from('affiliate_orders').select('commission_amount, status')
      if (allAffOrders) {
        totalAffOrders = allAffOrders.length
        allAffOrders.forEach(o => {
          if (o.status === 'pending') pendingComm += Number(o.commission_amount || 0)
          if (o.status === 'approved' || o.status === 'paid') approvedComm += Number(o.commission_amount || 0)
        })
      }

      // 5. Calculate Internal Totals
      let intRev = 0
      let totalIntOrders = 0
      const { data: allIntOrders } = await supabase.from('marketplace_orders').select('total_amount, status')
      if (allIntOrders) {
        totalIntOrders = allIntOrders.length
        allIntOrders.forEach(o => {
          if (o.status !== 'cancelled') intRev += Number(o.total_amount || 0)
        })
      }

      // Set Stats
      setStats({
        totalClicks: clickCount || 0,
        affiliateOrders: totalAffOrders,
        pendingCommission: pendingComm,
        approvedCommission: approvedComm,
        internalOrders: totalIntOrders,
        internalRevenue: intRev
      })

      if (affOrders) setRecentAffiliateOrders(affOrders)
      if (intOrders) setRecentInternalOrders(intOrders)

    } catch (error) {
      console.error("Error fetching admin stats:", error)
    } finally {
      setLoading(false)
    }
  }

  // ... (UI Part will come in next message)
  // ... (Part 1 ka code yahan khatam hua hoga)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue & Commissions</h1>
          <p className="text-sm text-gray-500">Track your earnings from Affiliate partners and Internal marketplace.</p>
        </div>
        <button 
          onClick={fetchAdminStats}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* 6 Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        
        {/* Affiliate Stats */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Affiliate Clicks</p>
          <p className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.totalClicks}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Affiliate Orders</p>
          <p className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.affiliateOrders}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-yellow-100 bg-yellow-50/30">
          <p className="text-xs text-yellow-600 font-medium uppercase tracking-wider mb-1">Pending Affiliate Comm.</p>
          <p className="text-3xl font-bold text-yellow-700">₹{loading ? '...' : stats.pendingCommission.toFixed(2)}</p>
        </div>

        {/* Internal Stats */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 bg-green-50/30">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wider mb-1">Approved Affiliate Comm.</p>
          <p className="text-3xl font-bold text-green-700">₹{loading ? '...' : stats.approvedCommission.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 bg-blue-50/30">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Internal Orders</p>
          <p className="text-3xl font-bold text-blue-700">{loading ? '...' : stats.internalOrders}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100 bg-purple-50/30">
          <p className="text-xs text-purple-600 font-medium uppercase tracking-wider mb-1">Internal Revenue (GMV)</p>
          <p className="text-3xl font-bold text-purple-700">₹{loading ? '...' : stats.internalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Affiliate Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Recent Affiliate Orders</h2>
            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border">Top 10</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="p-3 font-medium">Order Ref</th>
                  <th className="p-3 font-medium">Partner</th>
                  <th className="p-3 font-medium">Comm.</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading...</td></tr>
                ) : recentAffiliateOrders.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">No affiliate orders yet.</td></tr>
                ) : (
                  recentAffiliateOrders.map((order: any) => (
                    <tr key={order.id || Math.random()} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs text-gray-600">{order.external_order_ref || 'N/A'}</td>
                      <td className="p-3 font-medium text-gray-900">{order.affiliate_partners?.name || 'Partner'}</td>
                      <td className="p-3 font-bold text-gray-900">₹{order.commission_amount || 0}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          order.status === 'approved' || order.status === 'paid' ? 'bg-green-100 text-green-700' :
                          order.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Internal Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Recent Internal Orders</h2>
            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border">Top 10</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="p-3 font-medium">Order ID</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading...</td></tr>
                ) : recentInternalOrders.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">No internal orders yet.</td></tr>
                ) : (
                  recentInternalOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs text-gray-600">{order.id.slice(0, 8)}...</td>
                      <td className="p-3 font-bold text-gray-900">₹{order.total_amount}</td>
                      <td className="p-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          order.status === 'paid' || order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}