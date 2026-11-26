'use client';
import { CustomerLiveMap } from '@/components/LiveTracker';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function CustomerOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'delivered' | 'cancelled'>('all');

  const fetchOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const cancelOrder = async (orderId: string) => {
    if (!confirm('क्या आप वाकई यह ऑर्डर कैंसल करना चाहते हैं?')) return;
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    fetchOrders();
  };

  const filtered = orders.filter((o) => {
    const st = (o.status || 'pending').toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'pending') return st === 'pending';
    if (filter === 'processing') return ['confirmed', 'accepted', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes(st);
    if (filter === 'delivered') return st === 'delivered' || st === 'completed';
    if (filter === 'cancelled') return ['cancelled', 'rejected', 'declined'].includes(st);
    return true;
  });

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Orders...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-gray-800">My Shop Orders</h1>
          <p className="text-xs text-gray-500">Track deliveries, invoices &amp; cancelled orders</p>
        </div>
        <Link href="/customer/shop" className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl">
          + Shop More
        </Link>
      </div>

      {/* Filter Tabs including Cancelled / Rejected */}
      <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 no-scrollbar max-w-2xl mx-auto">
        {[
          { id: 'all', label: `All (${orders.length})` },
          { id: 'pending', label: `Pending (${orders.filter(o => (o.status || 'pending').toLowerCase() === 'pending').length})` },
          { id: 'processing', label: `Processing (${orders.filter(o => ['confirmed', 'accepted', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes((o.status || '').toLowerCase())).length})` },
          { id: 'delivered', label: `Delivered (${orders.filter(o => ['delivered', 'completed'].includes((o.status || '').toLowerCase())).length})` },
          { id: 'cancelled', label: `Rejected / Cancelled (${orders.filter(o => ['cancelled', 'rejected', 'declined'].includes((o.status || '').toLowerCase())).length})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${filter === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-gray-800 font-bold text-sm">इस कैटेगरी में कोई ऑर्डर नहीं है।</p>
            <Link href="/customer/shop" className="inline-block mt-3 bg-indigo-600 text-white text-xs font-bold px-5 py-2 rounded-xl">Go to Shop</Link>
          </div>
        ) : (
          filtered.map((order) => {
            const st = (order.status || 'pending').toLowerCase();
            const isRejected = ['cancelled', 'rejected', 'declined'].includes(st);
            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
{['out_for_delivery', 'shipped', 'on_the_way', 'dispatched'].includes((order.status || '').toLowerCase()) && <CustomerLiveMap table="orders" recordId={order.id} title="Live Delivery Partner Location" />}
                <div className="p-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">Order #{String(order.id).slice(0, 6).toUpperCase()}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isRejected ? 'bg-red-100 text-red-700' : st === 'delivered' ? 'bg-emerald-100 text-emerald-700' : st === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {order.status || 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    {order.shipping_address && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">📍 {order.shipping_address}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-indigo-700">₹{order.total_amount ?? order.amount ?? 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{order.payment_method || 'COD'}</p>
                  </div>
                </div>

                {isRejected && (
                  <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-[11px] text-red-700 font-semibold">
                    ❌ यह ऑर्डर {st === 'rejected' ? 'प्रोवाइडर द्वारा रिजेक्ट' : 'कैंसल'} कर दिया गया है। {order.cancel_reason ? `कारण: ${order.cancel_reason}` : ''}
                  </div>
                )}

                <div className="px-4 py-2.5 bg-slate-50 border-t flex justify-between items-center gap-2">
                  {st === 'pending' ? (
                    <button onClick={() => cancelOrder(order.id)} className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                      Cancel Order
                    </button>
                  ) : <span />}
                  <Link href={`/customer/invoice?type=order&id=${order.id}`} className="bg-indigo-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-sm">
                    🧾 Tax Invoice
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
