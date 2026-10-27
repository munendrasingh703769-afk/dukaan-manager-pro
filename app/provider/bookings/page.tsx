'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Service = { id: string; name: string; price: number; }
type Booking = { id: string; customer_name: string; customer_phone: string; booking_date: string; booking_time: string; status: string; notes: string; service_id: string; }

export default function ProviderBookingsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId);
    if (servData) setServices(servData);

    const { data: bookData } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('provider_business_id', activeId)
      .order('created_at', { ascending: false });
    if (bookData) setBookings(bookData as any);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  const handleUpdateBooking = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase.from('service_bookings').update({ status: newStatus }).eq('id', bookingId);
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
  };

  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? { name: service.name, price: service.price } : { name: 'Unknown Service', price: 0 };
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Bookings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">All Bookings</h1>
          <p className="text-sm text-gray-500">Manage your customer service requests</p>
        </div>
        <button onClick={fetchData} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition">
          🔄 Refresh
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-800 font-bold text-lg">Abhi tak koi booking nahi aayi.</p>
          <p className="text-gray-500 text-sm mt-1">Jab koi customer book karega, wo yahan dikhega.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => {
            const serviceDetails = getServiceDetails(booking.service_id);
            return (
              <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    booking.status === 'pending' ? 'bg-yellow-400' : 
                    booking.status === 'accepted' ? 'bg-green-500' : 
                    'bg-red-500'
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
                    booking.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' : 
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
                
                {booking.notes && (
                  <div className="ml-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Customer Note:</p>
                    <p className="text-sm text-blue-700 italic">{booking.notes}</p>
                  </div>
                )}

                {booking.status === 'pending' && (
                  <div className="flex space-x-3 pt-2 pl-2">
                    <button onClick={() => handleUpdateBooking(booking.id, 'rejected')} className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-xl font-bold hover:bg-red-50 transition active:scale-95">Reject</button>
                    <button onClick={() => handleUpdateBooking(booking.id, 'accepted')} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-md transition active:scale-95">Accept Order</button>
                  </div>
                )}
                {booking.status === 'accepted' && (
                   <button onClick={() => handleUpdateBooking(booking.id, 'completed')} className="w-[calc(100%-8px)] ml-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md transition active:scale-95 mt-2">Mark as Completed</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}