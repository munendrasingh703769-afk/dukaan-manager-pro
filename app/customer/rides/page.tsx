'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function ProviderRidesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    setLoading(true);
    // Fetch searching rides (ya jo is provider ne accept ki hain)
    const { data } = await supabase
      .from('ride_bookings')
      .select(`*, profiles:customer_id(full_name, phone)`)
      .order('created_at', { ascending: false });
      
    if (data) setRides(data);
    setLoading(false);
  };

  useEffect(() => { fetchRides(); }, []);
    const { error } = await supabase.from('ride_bookings').insert([{
      customer_id: user?.id || null,
      ride_type: rideType,
      pickup_location: pickup,
      drop_location: drop,
      estimated_fare: fare,
      status: 'searching'
    }]);

    if (!error) {
      // 👇 NAYA CODE: Ride Notification
      await supabase.from('notifications').insert([{
        business_id: getCurrentBusinessId(), // Filhal current user (agar provider) ko jayega, baad me hum sabko broadcast karenge
        title: 'New Ride Request! 🏍️',
        message: `A customer needs a ${rideType} from ${pickup} to ${drop}.`,
        type: 'ride'
      }]);

      alert(`Searching for a ${rideType.toUpperCase()}... Fare: ₹${fare}`);
      router.push('/customer/my-rides');
    } else {
      alert("Error: " + error.message);
    }
  

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Ride & Transport Requests</h1>
          <p className="text-sm text-gray-500">Accept passenger rides and parcels</p>
        </div>
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Rides & Transport</h1>
        <div className="flex gap-2">
          <Link href="/customer/my-rides" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">My Rides</Link>
          <Link href="/customer" className="text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">Home</Link>
        </div>
      </div>
        <button onClick={fetchRides} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm">🔄 Refresh</button>
      </div>

      {loading ? <p className="text-center font-bold text-blue-600">Loading...</p> : rides.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-800 font-bold text-lg">Abhi koi ride request nahi hai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rides.map(ride => (
            <div key={ride.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-indigo-700 capitalize">{ride.ride_type} Request</h3>
                <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${ride.status === 'searching' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{ride.status}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Customer</p>
                <p className="text-sm font-bold">{ride.profiles?.full_name || 'Customer'}</p>
                <p className="text-xs text-blue-600">📞 {ride.profiles?.phone || 'N/A'}</p>
              </div>
              <div className="space-y-2 relative">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-300"></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-green-500 rounded-full z-10"></div><p className="text-sm font-medium">{ride.pickup_location}</p></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-red-500 rounded-full z-10"></div><p className="text-sm font-medium">{ride.drop_location}</p></div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <p className="font-black text-xl text-gray-800">₹{ride.estimated_fare}</p>
                {ride.status === 'searching' && (
                  <button onClick={() => updateStatus(ride.id, 'accepted')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md">Accept Ride</button>
                )}
                {ride.status === 'accepted' && (
                  <button onClick={() => updateStatus(ride.id, 'completed')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md">Complete Ride</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}