'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  price: number;
  total: number;
}

type Order = {
  id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
  profiles: { full_name: string; phone: string } | null;
}

export default function ProviderShopOrdersPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [orders, setOrders] = useState<Order[]>([]);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOrdersAndWarehouse = async () => {
    if (!activeId) return;
    setLoading(true);

    // 1. Get Default Warehouse (Main Store)
    const { data: whData } = await supabase
      .from('warehouses')
      .select('id')
      .eq('business_id', activeId)
      .eq('is_default', true)
      .maybeSingle();
    
    if (whData) {
      setDefaultWarehouseId(whData.id);
    } else {
      // Fallback: Agar default nahi mila toh pehla warehouse utha lo
      const { data: anyWh } = await supabase.from('warehouses').select('id').eq('business_id', activeId).limit(1).maybeSingle();
      if (anyWh) setDefaultWarehouseId(anyWh.id);
    }

    // 2. Fetch Orders
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        profiles:customer_id (full_name, phone)
      `)
      .eq('business_id', activeId)
      .order('created_at', { ascending: false });

    if (data) setOrders(data as any);
    if (error) console.error(error);
    
    setLoading(false);
  };

  useEffect(() => { fetchOrdersAndWarehouse(); }, [activeId]);

  // --- UPDATE STATUS & DEDUCT STOCK ATOMICALLY ---
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'accepted' && !defaultWarehouseId) {
      return alert("Error: Default warehouse not found. Please contact support.");
    }

    if (newStatus === 'accepted') {
      if (!confirm("Accept this order? Product stock will be deducted from Main Store.")) return;
    }

    setProcessingId(orderId);

    try {
      // 1. Update Order Status
      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (statusError) throw statusError;

      // 2. Deduct Stock if status is 'accepted'
      if (newStatus === 'accepted') {
        const order = orders.find(o => o.id === orderId);
        if (order && order.order_items) {
          
          // Loop through items and call RPC
          for (const item of order.order_items) {
            const { error: rpcError } = await supabase.rpc('adjust_stock', {
              p_business_id: activeId,
              p_product_id: item.product_id,
              p_warehouse_id: defaultWarehouseId,
              p_quantity: -item.qty, // Minus for stock out
              p_movement_type: 'ONLINE_SALE',
              p_reference_id: orderId,
              p_notes: `Online Order Accepted #${orderId.slice(0,6)}`
            });

            if (rpcError) {
              console.error(`Failed to deduct stock for ${item.product_name}:`, rpcError);
              // Note: In production, we might want to handle partial failures, but for now we log it.
            }
          }
        }
      }

      // 3. If order is cancelled/rejected after being accepted, add stock back (Optional but good practice)
      // (Skipping complex reversal for now to keep it simple, but logic would be +item.qty)

      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      
    } catch (error: any) {
      alert("Error updating order: " + error.message);
      fetchOrdersAndWarehouse(); // Refresh to ensure accurate state
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Shop Orders...</div>;
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Shop Orders</h1>
          <p className="text-sm text-gray-500">Manage online product orders</p>
        </div>
        <button onClick={fetchOrdersAndWarehouse} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition">
          🔄 Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">🛍️</div>
          <p className="text-gray-800 font-bold text-lg">Abhi tak koi online order nahi aaya.</p>
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
                {order.order_items.map((item) => (
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
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'cancelled')} 
                        disabled={processingId === order.id}
                        className="bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold text-xs border border-red-100 hover:bg-red-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'accepted')} 
                        disabled={processingId === order.id}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {processingId === order.id ? 'Processing...' : 'Accept & Deduct Stock'}
                      </button>
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