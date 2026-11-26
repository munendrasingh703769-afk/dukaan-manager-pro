import { LiveGpsBroadcaster } from '@/components/LiveTracker';
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'
import ChatModal from '@/components/ui/ChatModal'

type Service = { id: string; name: string; price: number; }
type Worker = { id: string; name: string; role: string; }
type Booking = { 
  id: string; customer_name: string; customer_phone: string; 
  booking_date: string; booking_time: string; status: string; 
  notes: string; service_id: string; assigned_worker_id: string | null;
  payment_status: string; utr_number: string | null; completion_otp: string | null;
  customer_id: string | null;
}

export default function ProviderBookingsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [billBooking, setBillBooking] = useState<any | null>(null);
  const [srvCharge, setSrvCharge] = useState<number>(0);
  const [usedParts, setUsedParts] = useState<any[]>([]);
  const [savingBill, setSavingBill] = useState(false);

  const openPartsModal = (b: any) => {
    const srv = services.find((s) => s.id === b.service_id);
    setBillBooking(b);
    setSrvCharge(Number(b.total_amount ?? srv?.price ?? 0) - (Array.isArray(b.used_items) ? b.used_items.reduce((sum: number, it: any) => sum + Number(it.price || 0) * Number(it.qty || 1), 0) : 0));
    setUsedParts(Array.isArray(b.used_items) ? b.used_items : []);
  };

  const savePartsAndBill = async () => {
    if (!billBooking) return;
    setSavingBill(true);
    const partsTotal = usedParts.reduce((s, p) => s + Number(p.price || 0) * Number(p.qty || 1), 0);
    const grand = Number(srvCharge || 0) + partsTotal;
    await supabase.from('service_bookings').update({
      used_items: usedParts,
      total_amount: grand
    }).eq('id', billBooking.id);
    // Deduct stock for linked inventory items
    for (const p of usedParts) {
      if (p.product_id && !p.deducted) {
        const prod = productsList.find((x) => x.id === p.product_id);
        if (prod) {
          const nextStock = Math.max(0, Number(prod.stock_qty || 0) - Number(p.qty || 1));
          await supabase.from('products').update({ stock_qty: nextStock }).eq('id', prod.id);
        }
        p.deducted = true;
      }
    }
    setBillBooking(null);
    setSavingBill(false);
    fetchData();
  };

  const fetchData = async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true);

    const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId);
    if (servData) setServices(servData);

    const { data: workerData } = await supabase.from('provider_workers').select('*').eq('business_id', activeId).eq('status', 'active');
    if (workerData) setWorkers(workerData);

    const { data: bookData } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('provider_business_id', activeId)
      .order('created_at', { ascending: false });
    if (bookData) setBookings(bookData as any);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- UPDATE STATUS (With Customer Notification) ---
  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    let updateData: any = { status: newStatus };

    if (newStatus === 'accepted') {
      updateData.completion_otp = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const { data: updatedBooking, error } = await supabase
      .from('service_bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();
    
    if (!error && updatedBooking) {
      setBookings(bookings.map(b => 
        b.id === bookingId 
          ? { ...b, status: newStatus, completion_otp: updateData.completion_otp || b.completion_otp } 
          : b
      ));

      // 👇 Notify Customer
      if (updatedBooking.customer_id) {
        await supabase.from('notifications').insert([{
          customer_id: updatedBooking.customer_id,
          title: `Booking ${newStatus.toUpperCase()}!`,
          message: `Your booking for ${updatedBooking.customer_name} has been ${newStatus}.`,
          type: 'booking_update'
        }]);
      }
    }
  };

  const handleAssignWorker = async (bookingId: string, workerId: string) => {
    const { error } = await supabase.from('service_bookings').update({ assigned_worker_id: workerId || null }).eq('id', bookingId);
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, assigned_worker_id: workerId || null } : b));
    }
  };

  const handleVerifyPayment = async (bookingId: string) => {
    const { error } = await supabase.from('service_bookings').update({ payment_status: 'paid' }).eq('id', bookingId);
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, payment_status: 'paid' } : b));
      alert("Payment Verified Successfully!");
    }
  };

  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? { name: service.name, price: service.price } : { name: 'Unknown', price: 0 };
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Bookings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">All Bookings</h1>
          <p className="text-sm text-gray-500">Manage jobs, payments & assign workers</p>
        </div>
        <button onClick={fetchData} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition">
          🔄 Refresh
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-800 font-bold text-lg">Abhi tak koi booking nahi aayi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="mb-3 flex justify-end">
        <a href="/sales" className="bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm">
          🧾 Offline Customer Bill (Service + Parts)
        </a>
      </div>
      {bookings.map((booking) => {
            const serviceDetails = getServiceDetails(booking.service_id);
            const assignedWorker = workers.find(w => w.id === booking.assigned_worker_id);

            return (
              <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative overflow-hidden flex flex-col">
<LiveGpsBroadcaster table="service_bookings" recordId={booking.id} active={['on_the_way', 'in_progress'].includes((booking.status || '').toLowerCase())} label="Technician Live GPS Sharing ON" />
                
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    booking.status === 'pending' ? 'bg-yellow-400' : 
                    booking.status === 'accepted' ? 'bg-blue-500' : 
                    booking.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>

                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{(booking as any).service_name || serviceDetails.name}</h3>
                    <p className="text-sm text-purple-600 font-bold bg-purple-50 inline-block px-2 py-0.5 rounded mt-1">
                      ₹{serviceDetails.price}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                    booking.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {booking.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl ml-2">
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Customer</span> <span className="font-medium">{booking.customer_name}</span></p>
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Phone</span> <span className="font-medium text-blue-600 flex items-center gap-2">{booking.customer_phone} {booking.customer_phone && <a href={`tel:${booking.customer_phone}`} className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">📞 Call</a>}</span></p>
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Date</span> <span className="font-medium">{booking.booking_date}</span></p>
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Time</span> <span className="font-medium">{booking.booking_time || 'Any time'}</span></p>
                  {(booking as any).customer_address && <p className="col-span-2 flex flex-col border-t pt-2"><span className="text-xs text-gray-400 font-semibold uppercase">📍 Customer Address</span> <span className="font-semibold text-slate-800">{(booking as any).customer_address}</span></p>}
                </div>

                {booking.completion_otp && booking.status !== 'completed' && (
                  <div className="ml-2 bg-orange-50 border border-orange-200 p-2 rounded-xl text-center">
                    <p className="text-[10px] text-orange-800 font-bold uppercase">Customer OTP</p>
                    <p className="text-xl font-black text-orange-600 tracking-widest">{booking.completion_otp}</p>
                  </div>
                )}

                <div className="ml-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-indigo-800">Payment Status:</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      booking.payment_status === 'paid' ? 'bg-green-500 text-white' : 
                      booking.payment_status === 'pending_verification' ? 'bg-orange-500 text-white' : 
                      'bg-gray-300 text-gray-700'
                    }`}>
                      {booking.payment_status?.toUpperCase() || 'UNPAID'}
                    </span>
                  </div>

                  {booking.utr_number && (
                    <p className="text-xs text-indigo-700 mt-2">UTR: <span className="select-all font-mono font-bold">{booking.utr_number}</span></p>
                  )}

                  {booking.payment_status === 'pending_verification' && (
                    <button onClick={() => handleVerifyPayment(booking.id)} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-xs shadow-sm mt-2">
                      Verify & Mark as Paid
                    </button>
                  )}
                </div>

                {(booking.status === 'accepted' || booking.status === 'completed') && (
                  <div className="ml-2 p-3 bg-gray-50 rounded-xl border border-gray-200 mt-auto">
                    <label className="text-xs font-bold text-gray-700 block mb-2">Assign to Worker:</label>
                    <select 
                      value={booking.assigned_worker_id || ''} 
                      onChange={(e) => handleAssignWorker(booking.id, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                    >
                      <option value="">-- Unassigned --</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                      ))}
                    </select>
                    {assignedWorker && (
                      <p className="text-xs text-green-600 font-bold mt-2">✓ Assigned to: {assignedWorker.name}</p>
                    )}
                  </div>
                )}

                <div className="ml-2 flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => openPartsModal(booking)}
                    className="flex-1 bg-amber-50 text-amber-800 border border-amber-200 py-2 rounded-xl font-bold text-xs"
                  >
                    🔧 Add Parts / Bill ({Array.isArray((booking as any).used_items) ? (booking as any).used_items.length : 0})
                  </button>
                  <a
                    href={`/customer/invoice?type=booking&id=${booking.id}`}
                    className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold text-xs text-center"
                  >
                    🧾 Tax Invoice
                  </a>
                </div>
                <div className="ml-2">
                  <button onClick={() => setChatBookingId(booking.id)} className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-2 rounded-xl font-bold text-sm">
                    💬 Chat with Customer
                  </button>
                </div>

                <div className="pt-2 pl-2">
                  {booking.status === 'pending' && (
                    <div className="flex space-x-3">
                      <button onClick={() => handleUpdateStatus(booking.id, 'rejected')} className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-xl font-bold hover:bg-red-50">Reject</button>
                      <button onClick={() => handleUpdateStatus(booking.id, 'accepted')} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md">Accept</button>
                    </div>
                  )}
                  {booking.status === 'accepted' && (
                     <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-200">
                       <p className="text-blue-700 font-bold text-xs">Worker will complete the job.</p>
                     </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {billBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">Service Charge + Used Material</h3>
              <button onClick={() => setBillBooking(null)} className="text-red-500 font-bold">✕</button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Service Charge (₹)</label>
              <input type="number" value={srvCharge} onChange={(e) => setSrvCharge(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm font-bold mt-1" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-600">Used Items / Spare Parts</label>
                <button type="button" onClick={() => setUsedParts([...usedParts, { product_id: '', name: '', qty: 1, price: 0, gst_percent: 0 }])} className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">+ Add Item</button>
              </div>
              {usedParts.map((pt, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border space-y-2">
                  <select
                    value={pt.product_id || ''}
                    onChange={(e) => {
                      const prod = productsList.find((x) => x.id === e.target.value);
                      setUsedParts(usedParts.map((it, i) => i === idx ? (prod ? { ...it, product_id: prod.id, name: prod.name, price: prod.selling_price || 0, gst_percent: prod.gst_percent || 0, hsn_code: prod.hsn_code || '' } : { ...it, product_id: '' }) : it));
                    }}
                    className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="">-- Custom Item (Type Below) --</option>
                    {productsList.map((pr) => <option key={pr.id} value={pr.id}>{pr.name} (₹{pr.selling_price} • Stock: {pr.stock_qty ?? 0})</option>)}
                  </select>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="text" placeholder="Item Name" value={pt.name} onChange={(e) => setUsedParts(usedParts.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} className="border rounded-lg px-2 py-1 text-xs bg-white" />
                    <input type="number" placeholder="Qty" value={pt.qty} onChange={(e) => setUsedParts(usedParts.map((it, i) => i === idx ? { ...it, qty: Number(e.target.value) } : it))} className="border rounded-lg px-2 py-1 text-xs bg-white" />
                    <input type="number" placeholder="Rate ₹" value={pt.price} onChange={(e) => setUsedParts(usedParts.map((it, i) => i === idx ? { ...it, price: Number(e.target.value) } : it))} className="border rounded-lg px-2 py-1 text-xs bg-white" />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-xs font-black">Total Bill: ₹{(Number(srvCharge || 0) + usedParts.reduce((s, p) => s + Number(p.price || 0) * Number(p.qty || 1), 0)).toFixed(2)}</span>
              <button disabled={savingBill} onClick={savePartsAndBill} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
                {savingBill ? 'Saving...' : 'Save & Update Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {chatBookingId && (
        <ChatModal bookingId={chatBookingId} role="provider" onClose={() => setChatBookingId(null)} />
      )}
    </div>
  );
}