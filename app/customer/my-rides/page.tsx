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

  // OTP Modal States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<any>(null);

  // Fetch rides with Provider (Driver) details
  const fetchMyRides = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rideData } = await supabase
      .from('ride_bookings')
      .select(`
        *,
        businesses:provider_business_id (name, phone, logo_url)
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (rideData) setRides(rideData);
    setLoading(false);
  };

  useEffect(() => {
    fetchMyRides();
    // Auto-refresh for live tracking every 10 seconds
    const interval = setInterval(fetchMyRides, 10000);
    return () => clearInterval(interval);
  }, [supabase]);

  // Filter logic for Tabs
  const filteredRides = rides.filter(ride => {
    if (activeTab === 'active') return ['accepted', 'arrived', 'in_progress'].includes(ride.status);
    if (activeTab === 'upcoming') return ride.status === 'searching';
    if (activeTab === 'history') return ['completed', 'cancelled'].includes(ride.status);
    return true;
  });

  const activeRide = filteredRides[0]; // Assuming 1 active ride at a time

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-24 font-sans">
      
      {/* 🔵 HEADER */}
      <header className="bg-blue-600 text-white pt-6 pb-6 px-4 rounded-b-3xl shadow-md relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer')} className="w-9 h-9 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
              ←
            </button>
            <div>
              <h1 className="text-xl font-black tracking-wide">My Rides</h1>
              <p className="text-blue-200 text-[11px]">Track your trips</p>
            </div>
          </div>
          <Link href="/customer/profile" className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-blue-400 flex items-center justify-center font-bold">
            <span className="text-xl">M</span>
          </Link>
        </div>

        {/* 🎯 TABS */}
        <div className="flex bg-blue-700/50 p-1 rounded-xl">
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100'}`}>
            🚗 Active ({rides.filter(r => ['accepted', 'arrived', 'in_progress'].includes(r.status)).length})
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
                  {ride.status !== 'searching' && ride.status !== 'completed' ? (
                    <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> LIVE
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">{ride.status}</span>
                  )}
                  <span className="font-bold text-gray-800 text-sm">Ride #{ride.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  🕒 8 min away
                </div>
              </div>

              {/* 🗺️ MAP PLACEHOLDER (Premium Design) */}
              <div className="relative h-48 bg-[#E5E9F0] w-full overflow-hidden">
                {/* Map Grid Lines (CSS Mockup) */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#9CA3AF 1px, transparent 1px), linear-gradient(90deg, #9CA3AF 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {/* Route Line */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <path d="M 50 120 Q 150 50, 250 80 T 350 40" fill="none" stroke="#3B82F6" strokeWidth="4" strokeDasharray="8 4" />
                </svg>

                {/* Pickup Marker */}
                <div className="absolute left-8 bottom-10 flex flex-col items-center">
                  <div className="bg-white px-2 py-1 rounded shadow-md text-[10px] font-bold mb-1 border border-gray-200">
                    Pickup: {ride.pickup_location.split(',')[0]}
                  </div>
                  <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">📍</div>
                </div>

                {/* Drop Marker */}
                <div className="absolute right-8 top-8 flex flex-col items-center">
                  <div className="bg-white px-2 py-1 rounded shadow-md text-[10px] font-bold mb-1 border border-gray-200">
                    Drop: {ride.drop_location.split(',')[0]}
                  </div>
                  <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">🏁</div>
                </div>

                {/* Driver Marker (Simulated moving) */}
                {ride.status === 'in_progress' && (
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce">
                    <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-sm">🏍️</div>
                  </div>
                )}
              </div>

              {/* Driver Info */}
              {ride.businesses && ride.status !== 'searching' && (
                <div className="p-4 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden border-2 border-blue-100">
                      {ride.businesses.logo_url ? (
                        <img src={ride.businesses.logo_url} alt="Driver" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-xl font-bold text-gray-500">{ride.businesses.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{ride.businesses.name}</h4>
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-1">⭐ 4.8 (124 rides)</p>
                      <p className="text-[10px] font-bold text-blue-600 mt-0.5">{ride.ride_type.toUpperCase()} • {ride.driver_vehicle_no}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${ride.businesses.phone}`} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-lg shadow-sm">📞</a>
                    <button className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-lg shadow-sm">💬</button>
                  </div>
                </div>
              )}

              {/* Trip Details & Fare */}
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
                    <p className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded mt-1">PAID</p>
                  </div>
                </div>

                {/* Progress Stepper */}
                {ride.status !== 'searching' && ride.status !== 'cancelled' && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center relative">
                      <div className="absolute left-0 right-0 top-3 h-1 bg-gray-200 -z-10"></div>
                      <div className={`absolute left-0 top-3 h-1 -z-10 bg-blue-600 transition-all ${
                        ride.status === 'accepted' ? 'w-0' : ride.status === 'arrived' ? 'w-1/3' : ride.status === 'in_progress' ? 'w-2/3' : 'w-full'
                      }`}></div>

                      <div className="flex flex-col items-center gap-1 bg-white px-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${ride.status ? 'bg-blue-600' : 'bg-gray-300'}`}>✓</div>
                        <span className="text-[9px] font-bold text-gray-600">Accepted</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 bg-white px-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['arrived', 'in_progress', 'completed'].includes(ride.status) ? 'bg-blue-600' : 'bg-gray-300'}`}>🏍️</div>
                        <span className="text-[9px] font-bold text-gray-600 text-center">On the<br/>Way</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 bg-white px-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${['in_progress', 'completed'].includes(ride.status) ? 'bg-blue-600' : 'bg-gray-300'}`}>📍</div>
                        <span className="text-[9px] font-bold text-gray-600 text-center">Arriving<br/>Soon</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 bg-white px-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${ride.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}>🏁</div>
                        <span className="text-[9px] font-bold text-gray-600">Complete</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* OTP Display (Only if in progress or arrived) */}
                {['arrived', 'in_progress'].includes(ride.status) && ride.ride_otp && (
                  <div className="mt-4 bg-orange-50 border border-orange-200 p-3 rounded-xl text-center">
                    <p className="text-[10px] text-orange-800 font-bold uppercase mb-1">Share OTP with Driver</p>
                    <p className="text-2xl font-black text-orange-600 tracking-widest">{ride.ride_otp}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 📱 BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <Link href="/customer" className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/customer/shop" className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xl">🛍️</span>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        <Link href="/customer/explore" className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xl">🛠️</span>
          <span className="text-[10px] font-medium">Services</span>
        </Link>
        <Link href="/customer/my-rides" className="flex flex-col items-center gap-1 text-blue-600">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl shadow-md border-2 border-white -mt-4">
            🏍️
          </div>
          <span className="text-[10px] font-bold mt-0.5">My Rides</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>

    </div>
  );
}