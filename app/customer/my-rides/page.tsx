'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CustomerMyRidesPage() {
  const supabase = createClient();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyRides = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch rides with provider details (businesses table)
      const { data } = await supabase
        .from('ride_bookings')
        .select(`
          *,
          businesses:provider_business_id (name, phone)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setRides(data);
      setLoading(false);
    };
    fetchMyRides();
  }, [supabase]);

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Rides...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Rides & Parcels</h1>
          <p className="text-xs text-gray-500">Track your ongoing and past trips</p>
        </div>
        <Link href="/customer/rides" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">Book New</Link>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {rides.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 mt-4">
            <div className="text-5xl mb-4">🏍️</div>
            <p className="text-gray-800 font-bold text-lg">Aapne abhi tak koi ride book nahi ki hai.</p>
            <Link href="/customer/rides" className="inline-block mt-4 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md">
              Book a Ride
            </Link>
          </div>
        ) : (
          rides.map((ride) => (
            <div key={ride.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* Ride Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm capitalize">{ride.ride_type} Ride</h3>
                  <p className="text-xs text-gray-500 mt-1">{new Date(ride.created_at).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase ${
                  ride.status === 'searching' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                  ride.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                  'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {ride.status}
                </span>
              </div>

              {/* Route Details */}
              <div className="p-4 relative">
                <div className="absolute left-7 top-6 bottom-6 w-0.5 bg-gray-300"></div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow"></div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Pickup</p>
                      <p className="text-sm font-semibold text-gray-800">{ride.pickup_location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow"></div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Drop</p>
                      <p className="text-sm font-semibold text-gray-800">{ride.drop_location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Info (Only if accepted) */}
              {ride.status === 'accepted' && ride.businesses && (
                <div className="mx-4 mb-4 bg-blue-50 border border-blue-100 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-blue-600 font-bold uppercase">Your Driver / Provider</p>
                    <p className="text-sm font-bold text-blue-900">{ride.businesses.name}</p>
                  </div>
                  <a href={`tel:${ride.businesses.phone}`} className="bg-blue-600 text-white p-2 rounded-full shadow-md text-xl w-10 h-10 flex items-center justify-center">
                    📞
                  </a>
                </div>
              )}

              {/* Total Fare */}
              <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                <p className="text-sm text-gray-600 font-bold">Estimated Fare</p>
                <p className="text-xl font-black text-indigo-600">₹{ride.estimated_fare}</p>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation (Same as Home) */}
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
        <Link href="/customer/rides" className="flex flex-col items-center gap-1 text-indigo-600">
          <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">🏍️</div>
          <span className="text-[10px] font-bold">Rides</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>
    </div>
  );
}