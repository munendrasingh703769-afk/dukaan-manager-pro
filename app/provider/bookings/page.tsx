'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Service = { id: string; name: string; price: number; }
type Worker = { id: string; name: string; role: string; }
type Booking = { 
  id: string; customer_name: string; customer_phone: string; 
  booking_date: string; booking_time: string; status: string; 
  notes: string; service_id: string; assigned_worker_id: string | null;
  payment_status: string; utr_number: string | null; // Naye columns type me add kiye
}

export default function ProviderBookingsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);
  const fetchData = async () => {
    if (!activeId) return;
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

  // --- UPDATE STATUS ---
  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase.from('service_bookings').update({ status: newStatus }).eq('id', bookingId);
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
  };

  // --- ASSIGN WORKER ---
  const handleAssignWorker = async (bookingId: string, workerId: string) => {
    const { error } = await supabase.from('service_bookings').update({ assigned_worker_id: workerId || null }).eq('id', bookingId);
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, assigned_worker_id: workerId || null } : b));
    }
  };

  // --- VERIFY PAYMENT ---
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
          {bookings.map((booking) => {
            const serviceDetails = getServiceDetails(booking.service_id);
            const assignedWorker = workers.find(w => w.id === booking.assigned_worker_id);

            return (
              <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative overflow-hidden flex flex-col">
                
                {/* Status Bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    booking.status === 'pending' ? 'bg-yellow-400' : 
                    booking.status === 'accepted' ? 'bg-blue-500' : 
                    booking.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>

                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{serviceDetails.name}</h3>
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
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Phone</span> <span className="font-medium text-blue-600">{booking.customer_phone}</span></p>
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Date</span> <span className="font-medium">{booking.booking_date}</span></p>
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Time</span> <span className="font-medium">{booking.booking_time || 'Any time'}</span></p>
                </div>

                {/* PAYMENT STATUS (Naya Box) */}
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

                  {/* VERIFY BUTTON (Sirf tab dikhega jab UTR aaya ho) */}
                  {booking.payment_status === 'pending_verification' && (
                    <button 
                      onClick={() => handleVerifyPayment(booking.id)}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-xs shadow-sm mt-2 hover:bg-indigo-700 transition"
                    >
                      Verify & Mark as Paid
                    </button>
                  )}
                </div>

                {/* WORKER ASSIGNMENT */}
                {(booking.status === 'accepted' || booking.status === 'completed') && (
                  <div className="ml-2 p-3 bg-gray-50 rounded-xl border border-gray-200 mt-auto">
                    <label className="text-xs font-bold text-gray-700 block mb-2">Assign to Worker:</label>
                    <select 
                      value={booking.assigned_worker_id || ''} 
                      onChange={(e) => handleAssignWorker(booking.id, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
                {/* CHAT BUTTON */}
                <div className="ml-2 mb-2">
                  <button onClick={() => setChatBookingId(booking.id)} className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-2 rounded-xl font-bold text-sm hover:bg-indigo-100 transition">
                    💬 Chat with Customer
                  </button>
                </div>
      {chatBookingId && (
        <ChatModal bookingId={chatBookingId} role="customer" onClose={() => setChatBookingId(null)} />
      )}
                {/* ACTION BUTTONS */}
                <div className="pt-2 pl-2">
                  {booking.status === 'pending' && (
                    <div className="flex space-x-3">
                      <button onClick={() => handleUpdateStatus(booking.id, 'rejected')} className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-xl font-bold hover:bg-red-50">Reject</button>
                      <button onClick={() => handleUpdateStatus(booking.id, 'accepted')} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md">Accept</button>
                    </div>
                  )}
                  {booking.status === 'accepted' && (
                     <button onClick={() => handleUpdateStatus(booking.id, 'completed')} className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-md">Mark as Completed</button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}