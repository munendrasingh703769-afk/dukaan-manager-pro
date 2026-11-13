'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CustomerMarketplaceOrdersPage() {
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
    
    // Fetch orders placed by this customer, along with the items and product details
    const { data, error } = await supabase
      .from('marketplace_orders')
      .select(`
        id, total_amount, status, payment_method, payment_reference, created_at,
        marketplace_order_items (
          id, quantity, unit_price, status,
          marketplace_listings ( title, image_urls )
        )
      `)
      .eq('buyer_user_id', userId)
      .order('created_at', { ascending: false })

    if (data) setOrders(data)
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-medium text-gray-500">Loading your orders...</div>
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-medium text-gray-500">Please login to view orders.</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">Track your marketplace purchases.</p>
          </div>
          <Link href="/store" className="text-blue-600 font-medium text-sm hover:underline">
            ← Continue Shopping
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <span className="text-5xl mb-4 block">🛒</span>
            <p className="text-gray-500 font-medium text-lg">No orders found.</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">You haven't placed any marketplace orders yet.</p>
            <Link href="/store" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition inline-block">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Order Header */}
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Order #<span className="font-mono">{order.id.slice(0, 8)}</span></p>
                    <p className="text-xs text-gray-500 mt-1">Placed on: {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-lg font-extrabold text-gray-900">₹{order.total_amount}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4">
                  <div className="space-y-4">
                    {order.marketplace_order_items?.map((item: any) => (
                      <div key={item.id} className="flex gap-4 items-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center">
                          {item.marketplace_listings?.image_urls?.[0] ? (
                            <img src={item.marketplace_listings.image_urls[0]} alt={item.marketplace_listings.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-[10px]">No Img</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 text-sm">{item.marketplace_listings?.title || 'Product'}</h3>
                          <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.unit_price}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-medium ${
                            item.status === 'pending' ? 'text-yellow-600' :
                            item.status === 'shipped' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {item.status === 'pending' ? 'Processing' : item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Info */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <p><strong className="text-gray-700">Payment Method:</strong> {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Direct UPI'}</p>
                    {order.payment_reference && (
                      <p><strong className="text-gray-700">UTR/Txn ID:</strong> {order.payment_reference}</p>
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