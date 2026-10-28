'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ChatModal from '@/components/ChatModal'
type Booking = {
  id: string; customer_name: string; booking_date: string; 
  booking_time: string; status: string; notes: string;
  services: { name: string; price: number };
}

export default function CustomerBookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    // Note: Asli app me hum customer ki ID/Phone se filter karenge
    const { data } = await supabase
      .from('service_bookings')
      .select(`
        *,
        services:service_id (name, price)
      `)
      .order('created_at', { ascending: false });

    if (data) setBookings(data);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Bookings...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h1 className="text-xl font-bold text-gray-800">My Bookings</h1>
        <Link href="/customer" className="text-sm font-bold text-blue-600">← Back Home</Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">Aapne abhi tak koi booking nahi ki hai.</p>
        </div>
      ) : (
        bookings.map((b) => (
          <div key={b.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{b.services?.name || 'Service'}</h3>
                <p className="text-sm text-gray-500">Amount: ₹{b.services?.price || 0}</p>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                b.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 
                b.status === 'completed' ? 'bg-green-100 text-green-700' : 
                'bg-red-100 text-red-700'
              }`}>
                {b.status.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p><b>Date:</b> {b.booking_date} | {b.booking_time}</p>
              {b.notes && <p className="mt-1 italic text-gray-500">"{b.notes}"</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}