'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerMyRidesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'history'>('active');

  // Fetch rides with Provider (Driver) details
  const fetchMyRides = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase.from('ride_bookings').select('*').order('created_at', { ascending: false });
    
    // Agar user login hai toh uski rides, nahi toh sabhi searching rides dikhao (Testing ke liye)
    if (user) {
      query = query.eq('customer_id', user.id);
    } else {
      query = query.eq('status', 'searching');
    }

    const { data: rideData, error } = await query;

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (rideData) {
      // Manual Join for Driver Details (No Join errors)
      const ridesWithProviders = await Promise.all(
        rideData.map(async (ride) => {
          if (ride.provider_business_id) {
            const { data: biz } = await supabase
              .from('businesses')
              .select('name, phone, logo_url')
              .eq('id', ride.provider_business_id)
              .single();
            return { ...ride, businesses: biz };
          }
          return { ...ride, businesses: null };
        })
      );
      setRides(ridesWithProviders);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMyRides();
    // Auto-refresh for live tracking every 10 seconds
    const interval = setInterval(fetchMyRides, 10000);
    return () => clearInterval(interval);
  }, [supabase]);

  // 🎯 FILTER LOGIC (Fixed: Searching is now in Active)
  const filteredRides = rides.filter(ride => {
    if (activeTab === 'active') {
      return ['searching', 'accepted', 'arrived', 'in_progress'].includes(ride.status);
    }
    if (activeTab === 'upcoming') {
      return false; 
    }
    if (activeTab === 'history') {
      return ['completed', 'cancelled'].includes(ride.status);
    }
    return true;
  });

  // Cancel Ride Function
  const handleCancelRide = async (rideId: string) => {
    if (!confirm("Are you sure you want to cancel this ride request?")) return;
    const { error } = await supabase.from('ride_bookings').update({ status: 'cancelled' }).eq('id', rideId);
    if (!error) fetchMyRides();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-24 font-sans">
      
      {/* 🔵 HEADER */}
      <header className="bg-blue-600 text-white pt-6 pb-6 px-4 rounded-b-3xl shadow-md relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer')} className="w-10 h-10 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
              ←
            </button>
            <div>
              <h1 className="text-xl font-black tracking-wide">My Rides</h1>
              <p className="text-blue-200 text-[11px]">Track your trips</p>
            </div>
          </div>
          <Link href="/customer/profile" className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-blue-400 flex items-center justify-center font-bold shadow-md">
            <span className="text-xl">M</span>
          </Link>
        </div>

        {/* 🎯 TABS */}
        <div className="flex bg-blue-700/50 p-1 rounded-xl">
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100'}`}>
            🚗 Active ({rides.filter(r => ['searching', 'accepted', 'arrived', 'in_progress'].includes(r.status)).length})
          </button>
          <button onClick={() => setActiveTab('upcoming')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition ${activeTab === 'upcoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100'}`}>
            🕒 Upcoming
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100'}`}>
            📜 History
          </button>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        
        {loading && rides.length === 0 ? (
          <p className="text-center font-bold text-blue-600 py-10">Loading Rides...</p>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 mt-4">
            <div className="text-6xl mb-4">🏍️</div>
            <p className="text-gray-800 font-bold text-lg">No {activeTab} rides found.</p>
            <Link href="/customer/rides" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md">
              Book a Ride
            </Link>
          </div>
        ) : (
          filteredRides.map((ride) => (
            <div key={ride.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* Ride Header */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-2">
                  {ride.status === 'searching' ? (
                    <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> SEARCHING
                    </span>
                  ) : ride.status !== 'completed' && ride.status !== 'cancelled' ? (
                    <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> LIVE
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">{ride.status}</span>
                  )}
                  <span className="font-bold text-gray-800 text-sm">Ride #{ride.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  {ride.status === 'searching' ? '⏳ Please wait...' : '🕒 8 min away'}
                </div>
              </div>

              {/* 🗺️ MAP UI (Mockup) */}
              {ride.status !== 'searching' && (
                <div className="relative h-48 bg-[#E5E9F0] w-full overflow-hidden border-b border-gray-100">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#9CA3AF 1px, transparent 1px), linear-gradient(90deg, #9CA3AF 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <path d="M 50 120 Q 150 50, 250 80 T 350 40" fill="none" stroke="#3B82F6" strokeWidth="4" strokeDasharray="8 4" />
                  </svg>

                  <div className="absolute left-8 bottom-10 flex flex-col items-center">
                    <div className="bg-white px-2 py-1 rounded shadow-md text-[10px] font-bold mb-1 border border-gray-200">Pickup</div>
                    <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">📍</div>
                  </div>

                  <div className="absolute right-8 top-8 flex flex-col items-center">
                    <div className="bg-white px-2 py-1 rounded shadow-md text-[10px] font-bold mb-1 border border-gray-200">Drop</div>
                    <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">🏁</div>
                  </div>

                  {ride.status === 'in_progress' && (
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce">
                      <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-sm">🏍️</div>
                    </div>
                  )}
                </div>
              )}

              {/* 👨‍✈️ DRIVER INFO */}
              {ride.businesses && ride.status !== 'searching' && ride.status !== 'cancelled' && (
                <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-blue-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white rounded-full overflow-hidden border-2 border-blue-200 shadow-sm">
                      {ride.businesses.logo_url ? (
                        <img src={ride.businesses.logo_url} alt="Driver" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-2xl font-bold text-gray-400">{ride.businesses.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{ride.businesses.name}</h4>
                      <p className="text-xs text-gray-600 font-medium flex items-center gap-1">⭐ 4.8 (124 rides)</p>
                      <p className="text-[11px] font-black text-blue-700 mt-1 bg-blue-100 px-2 py-0.5 rounded-md inline-block">
                        {ride.ride_type.toUpperCase()} • {ride.driver_vehicle_no || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${ride.businesses.phone}`} className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl shadow-md active:scale-95 transition">📞</a>
                    <button className="w-12 h-12 bg-white text-blue-600 border border-blue-200 rounded-full flex items-center justify-center text-xl shadow-sm active:scale-95 transition">💬</button>
                  </div>
                </div>
              )}

              {/* Trip Details & Route */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                        <div className="w-0.5 h-8 bg-gray-300"></div>
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                      </div>
                      <div className="flex flex-col justify-between h-14">
                        <p className="text-xs text-gray-500 font-bold uppercase">Pickup</p>
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{ride.pickup_location}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1">Drop</p>
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{ride.drop_location}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right border-l border-gray-100 pl-4">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Trip Fare</p>
                    <h3 className="text-xl font-black text-gray-900">₹{ride.estimated_fare}</h3>
                    <p className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded mt-1">CASH</p>
                  </div>
                </div>

                {/* OTP DISPLAY */}
                {['arrived', 'in_progress'].includes(ride.status) && ride.ride_otp && (
                  <div className="mb-4 bg-orange-50 border border-orange-200 p-3 rounded-xl text-center">
                    <p className="text-[10px] text-orange-800 font-bold uppercase mb-1">Share OTP with Driver</p>
                    <p className="text-3xl font-black text-orange-600 tracking-[0.3em]">{ride.ride_otp}</p>
                  </div>
                )}

                {/* Cancel Button */}
                {ride.status === 'searching' && (
                  <button onClick={() => handleCancelRide(ride.id)} className="w-full mt-4 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-100 transition">
                    Cancel Ride Request
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 📱 BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <Link href="/customer" className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/customer/shop" className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600">
          <span className="text-xl">🛍️</span>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        <Link href="/customer/explore" className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600">
          <span className="text-xl">🛠️</span>
          <span className="text-[10px] font-medium">Services</span>
        </Link>
        <Link href="/customer/my-rides" className="flex flex-col items-center gap-1 text-blue-600">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl shadow-md border-2 border-white -mt-4">
            🏍️
          </div>
          <span className="text-[10px] font-bold mt-0.5">My Rides</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>

    </div>
  );
}