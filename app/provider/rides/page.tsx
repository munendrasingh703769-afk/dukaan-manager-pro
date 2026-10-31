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
    
    // 👇 1. Saari rides fetch karo (Bina join ke)
    const { data: rideData, error } = await supabase
      .from('ride_bookings')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching rides:", error);
      setLoading(false);
      return;
    }

    if (rideData) {
      // 👇 2. Har ride ke liye customer ka naam manually fetch karo
      const ridesWithCustomers = await Promise.all(
        rideData.map(async (ride) => {
          if (ride.customer_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('id', ride.customer_id)
              .single();
            return { ...ride, customer: profile };
          }
          return { ...ride, customer: null };
        })
      );
      setRides(ridesWithCustomers);
    }
    
    setLoading(false);
  };

  useEffect(() => { fetchRides(); }, [activeId]);

  const updateStatus = async (id: string, status: string) => {
    const updateData: any = { status };
    
    if (status === 'accepted') {
      updateData.provider_business_id = activeId;
      updateData.driver_vehicle_no = `UP-${Math.floor(10 + Math.random() * 89)}-AB-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const { error } = await supabase.from('ride_bookings').update(updateData).eq('id', id);
    if (!error) fetchRides();
    else alert(error.message);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Ride & Transport Requests</h1>
          <p className="text-sm text-gray-500">Accept passenger rides and parcels</p>
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
                <p className="text-sm font-bold">{ride.customer?.full_name || 'Customer Name Missing'}</p>
                <p className="text-xs text-blue-600">📞 {ride.customer?.phone || 'N/A'}</p>
              </div>
              
              <div className="space-y-2 relative">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-300"></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-green-500 rounded-full z-10"></div><p className="text-sm font-medium">{ride.pickup_location}</p></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-red-500 rounded-full z-10"></div><p className="text-sm font-medium">{ride.drop_location}</p></div>
              </div>

              <div className="flex justify-between items-center text-sm bg-blue-50 p-2 rounded-lg">
                <span className="text-blue-800 font-bold">Distance:</span>
                <span className="font-bold text-blue-900">{ride.distance_km} KM</span>
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