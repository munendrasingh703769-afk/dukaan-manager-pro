'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminMarketplaceOrdersPage() {
  const supabase = createClient()
  
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchAllOrders()
  }, [])

  async function fetchAllOrders() {
    setLoading(true)
    
    // Fetch all marketplace orders with items
    const { data, error } = await supabase
      .from('marketplace_orders')
      .select(`
        id, total_amount, status, payment_method, payment_reference, created_at,
        marketplace_order_items (
          id, quantity, unit_price, status, seller_user_id,
          marketplace_listings ( title, image_urls )
        )
      `)
      .order('created_at', { ascending: false })

    if (data) setOrders(data)
    setLoading(false)
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return

    try {
      // 1. Update the main order status
      await supabase
        .from('marketplace_orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      // 2. Update all items inside this order
      await supabase
        .from('marketplace_order_items')
        .update({ status: newStatus })
        .eq('order_id', orderId)

      alert(`Order marked as ${newStatus}`)
      fetchAllOrders() // Refresh the list

    } catch (error: any) {
      alert("Error updating status: " + error.message)
    }
  }

  // Filter Logic
  const filteredOrders = orders.filter((o: any) => {
    return filterStatus === 'all' || o.status === filterStatus
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Orders</h1>
          <p className="text-sm text-gray-500">Manage and verify all customer orders across the platform.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'pending', 'paid', 'shipped', 'delivered'].map((status) => (
            <button 
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition border ${
                filterStatus === status 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-lg">No orders found for this status.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Order Header */}
                <div className="bg-slate-50 p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900">Order <span className="font-mono text-sm text-blue-600">#{order.id.slice(0, 8)}</span></h3>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white px-3 py-1 border border-gray-200 rounded text-xs">
                      <span className="text-gray-500">Method:</span> <strong className="text-gray-800 uppercase">{order.payment_method}</strong>
                    </div>
                    {order.payment_method === 'upi' && (
                      <div className="bg-yellow-50 px-3 py-1 border border-yellow-200 rounded text-xs">
                        <span className="text-gray-500">UTR:</span> <strong className="text-yellow-700 font-mono">{order.payment_reference || 'N/A'}</strong>
                      </div>
                    )}
                    <div className="text-lg font-extrabold text-gray-900">₹{order.total_amount}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'paid' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4">
                  <div className="space-y-4">
                    {order.marketplace_order_items?.map((item: any) => (
                      <div key={item.id} className="flex gap-4 items-center bg-white border border-gray-100 p-2 rounded-lg">
                        <div className="w-16 h-16 bg-gray-50 rounded overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                          {item.marketplace_listings?.image_urls?.[0] ? (
                            <img src={item.marketplace_listings.image_urls[0]} alt="product" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-xs">No Img</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-sm">{item.marketplace_listings?.title}</h4>
                          <p className="text-xs text-gray-500">Seller ID: <span className="font-mono">{item.seller_user_id.slice(0, 8)}</span>...</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{item.unit_price * item.quantity}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons for Admin */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'paid')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm"
                      >
                        Verify & Mark as Paid
                      </button>
                    )}
                    {order.status === 'paid' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'shipped')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition shadow-sm"
                      >
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}