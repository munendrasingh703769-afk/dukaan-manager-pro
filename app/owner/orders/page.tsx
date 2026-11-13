'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SellerOrdersPage() {
  const supabase = createClient()
  
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        fetchMyOrders(user.id)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchMyOrders(userId: string) {
    setLoading(true)
    
    // Fetch order items for this seller, including order and listing details
    const { data, error } = await supabase
      .from('marketplace_order_items')
      .select(`
        id, quantity, unit_price, status, created_at,
        marketplace_orders ( id, buyer_user_id, total_amount, status, created_at ),
        marketplace_listings ( title, image_urls )
      `)
      .eq('seller_user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setOrders(data)
    }
    setLoading(false)
  }

  // Order status update karne ke liye
  async function updateOrderStatus(itemId: string, orderId: string, newStatus: string) {
    if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return

    // 1. Update item status
    await supabase.from('marketplace_order_items').update({ status: newStatus }).eq('id', itemId)

    // 2. Agar delievered ho gaya, toh main order ka status bhi update karein (Optional logic)
    if (newStatus === 'shipped') {
       await supabase.from('marketplace_orders').update({ status: 'shipped' }).eq('id', orderId)
    }

    // Refresh list
    if (user) fetchMyOrders(user.id)
  }

  if (!user && !loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-600">Please login to view orders.</p></div>
  }

  // ... (UI Part will come in next message)
  // ... (Part 1 ka code yahan khatam hua hoga)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-500">Manage and fulfill orders for your products.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 font-medium">Loading your orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <span className="text-4xl mb-4 block">📦</span>
          <p className="text-gray-500 font-medium text-lg">No orders received yet.</p>
          <p className="text-gray-400 text-sm mt-1">When customers buy your products, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((item: any) => {
            const order = item.marketplace_orders;
            const listing = item.marketplace_listings;
            
            // Agar data missing hai (edge case)
            if (!order || !listing) return null;

            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                
                {/* Left Side: Product Info */}
                <div className="p-4 md:p-6 flex-1 border-b md:border-b-0 md:border-r border-gray-100">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                      {listing.image_urls?.[0] ? (
                        <img src={listing.image_urls[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-xs">No Image</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base line-clamp-2">{listing.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">Order ID: <span className="font-mono text-xs">{order.id.slice(0, 8)}...</span></p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                {/* Middle: Order Details */}
                <div className="p-4 md:p-6 flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Quantity</p>
                      <p className="font-semibold text-gray-900">{item.quantity} Items</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Value</p>
                      <p className="font-bold text-gray-900">₹{item.unit_price * item.quantity}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Status & Action */}
                <div className="p-4 md:p-6 flex flex-col justify-center min-w-[200px]">
                  <div className="mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      item.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  {/* Action Buttons based on status */}
                  {item.status === 'pending' && (
                    <button 
                      onClick={() => updateOrderStatus(item.id, order.id, 'shipped')}
                      className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Mark as Shipped
                    </button>
                  )}
                  
                  {item.status === 'shipped' && (
                    <button 
                      onClick={() => updateOrderStatus(item.id, order.id, 'delivered')}
                      className="w-full bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Mark as Delivered
                    </button>
                  )}

                  {item.status === 'delivered' && (
                    <p className="text-sm text-green-600 font-medium text-center">Order Completed</p>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}