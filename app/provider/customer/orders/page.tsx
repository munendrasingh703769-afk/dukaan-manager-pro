'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CustomerOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch orders with items and business details
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          businesses!inner (name, city)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data);
      setLoading(false);
    };

    fetchOrders();
  }, [supabase]);

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Orders...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Shop Orders</h1>
          <p className="text-xs text-gray-500">Track your product deliveries</p>
        </div>
        <Link href="/customer/shop" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">Shop More</Link>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 mt-4">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-800 font-bold text-lg">Aapne abhi tak koi saman nahi kharida.</p>
            <p className="text-gray-500 text-sm mt-1">Shop Now par jaakar kharidari karein.</p>
            <Link href="/customer/shop" className="inline-block mt-4 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md">
              Go to Shop
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* Order Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Order #{order.id.slice(0, 6).toUpperCase()}</h3>
                  <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                  <p className="text-xs font-bold text-indigo-600 mt-1">From: {order.businesses?.name}</p>
                </div>
                <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase ${
                  order.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                  order.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                  'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {order.status}
                </span>
              </div>

              {/* Items List */}
              <div className="p-4 space-y-3">
                {order.order_items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-gray-800">{item.product_name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.qty} × ₹{item.price}</p>
                    </div>
                    <p className="font-bold text-gray-800">₹{item.total}</p>
                  </div>
                ))}
              </div>

              {/* Order Total */}
              <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                <p className="text-sm text-gray-600 font-bold">Total Amount</p>
                <p className="text-xl font-black text-indigo-600">₹{order.total_amount}</p>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation (Same as Home) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-3 pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <Link href="/customer" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/customer/shop" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">🛒</span>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        <Link href="/customer/explore" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">🛠️</span>
          <span className="text-[10px] font-medium">Services</span>
        </Link>
        <Link href="/customer/orders" className="flex flex-col items-center gap-1 text-indigo-600">
          <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">📦</div>
          <span className="text-[10px] font-bold">Orders</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>
    </div>
  );
}