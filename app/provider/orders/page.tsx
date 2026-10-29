'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function ProviderShopOrdersPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        profiles:customer_id (full_name, phone)
      `)
      .eq('business_id', activeId)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
    if (error) console.error(error);
    
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [activeId]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'accepted') {
      if (!confirm("Accept this order? Product stock will be deducted automatically.")) return;
    }

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    
    if (!error) {
      if (newStatus === 'accepted') {
        const order = orders.find(o => o.id === orderId);
        for (const item of order.order_items) {
          const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
          if (prod) {
            await supabase.from('products').update({ stock: prod.stock - item.qty }).eq('id', item.product_id);
          }
        }
      }
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } else {
      alert("Error updating order: " + error.message);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Orders...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Shop Orders</h1>
          <p className="text-sm text-gray-500">Manage product orders from customers</p>
        </div>
        <button onClick={fetchOrders} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition">
          🔄 Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">🛍️</div>
          <p className="text-gray-800 font-bold text-lg">Abhi tak koi shop order nahi aaya.</p>
          <p className="text-gray-500 text-sm mt-1">Jab customer shop se kuch kharidega, wo yahan dikhega.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 flex flex-col">
              
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Order #{order.id.slice(0, 6).toUpperCase()}</h3>
                  <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
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

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Customer Details</p>
                <p className="text-sm font-bold text-gray-800">{order.profiles?.full_name || 'Customer'}</p>
                <p className="text-xs text-blue-600 font-semibold">📞 {order.profiles?.phone || 'N/A'}</p>
              </div>

              <div className="space-y-2 flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase">Items to Deliver</p>
                {order.order_items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-1">
                    <div>
                      <p className="font-semibold text-gray-800">{item.product_name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.qty} × ₹{item.price}</p>
                    </div>
                    <p className="font-bold text-gray-800">₹{item.total}</p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Total Amount</p>
                  <p className="text-xl font-black text-indigo-600">₹{order.total_amount}</p>
                </div>

                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <>
                      <button onClick={() => handleUpdateStatus(order.id, 'cancelled')} className="bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold text-xs border border-red-100">Reject</button>
                      <button onClick={() => handleUpdateStatus(order.id, 'accepted')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md">Accept</button>
                    </>
                  )}
                  {order.status === 'accepted' && (
                    <button onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md">Dispatch Order</button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button onClick={() => handleUpdateStatus(order.id, 'delivered')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md">Mark Delivered</button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}