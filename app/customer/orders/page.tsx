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

      const { data } = await supabase
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
              
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Order #{order.id.slice(0, 6).toUpperCase()}</h3>
                  <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                  <p className="text-xs font-bold text-indigo-600 mt-1">From: {order.businesses?.name}</p>
                </div>
                <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase ${
                  order.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                  order.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                  order.status === 'out_for_delivery' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

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

              {/* 📍 ORDER TRACKING TIMELINE */}
              {order.status !== 'cancelled' && (
                <div className="px-4 py-4 border-t border-gray-100">
                  <div className="flex justify-between items-center relative">
                    {/* Background Line */}
                    <div className="absolute left-0 right-0 top-3 h-1 bg-gray-200 -z-10"></div>
                    {/* Active Progress Line */}
                    <div className={`absolute left-0 top-3 h-1 -z-10 transition-all duration-500 ${
                      order.status === 'pending' ? 'w-0' : 
                      order.status === 'accepted' ? 'w-1/3' : 
                      order.status === 'out_for_delivery' ? 'w-2/3' : 'w-full'
                    } bg-green-500`}></div>

                    {/* Step 1: Placed */}
                    <div className="flex flex-col items-center gap-1 bg-white px-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${order.status ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>✓</div>
                      <span className="text-[9px] font-bold text-gray-600">Placed</span>
                    </div>

                    {/* Step 2: Accepted */}
                    <div className="flex flex-col items-center gap-1 bg-white px-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${['accepted', 'out_for_delivery', 'delivered'].includes(order.status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>✓</div>
                      <span className="text-[9px] font-bold text-gray-600">Accepted</span>
                    </div>

                    {/* Step 3: Out for Delivery */}
                    <div className="flex flex-col items-center gap-1 bg-white px-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${['out_for_delivery', 'delivered'].includes(order.status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>🚚</div>
                      <span className="text-[9px] font-bold text-gray-600 text-center">On the<br/>Way</span>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="flex flex-col items-center gap-1 bg-white px-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${order.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>🏠</div>
                      <span className="text-[9px] font-bold text-gray-600">Delivered</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                <p className="text-sm text-gray-600 font-bold">Total Amount</p>
                <p className="text-xl font-black text-indigo-600">₹{order.total_amount}</p>
              </div>

            </div>
          ))
        )}
      </div>

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