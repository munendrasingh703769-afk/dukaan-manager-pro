'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Ride = {
  id: string;
  customer_id: string;
  ride_type: string;
  pickup_location: string;
  drop_location: string;
  distance_km: number;
  estimated_fare: number;
  status: string; // searching, accepted, arrived, in_progress, completed
  created_at: string;
  ride_otp: string;
  provider_business_id: string | null;
  driver_vehicle_no: string | null;
  customer?: { full_name: string; phone: string; rating?: number };
}

export default function ProviderRidesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'accepted' | 'ongoing' | 'completed'>('all');

  // OTP Modal States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpAction, setOtpAction] = useState<'start' | 'complete'>('start');

  // --- 1. FETCH RIDES (Searching OR Accepted by Me) ---
  const fetchRides = async () => {
    setLoading(true);
    // Get searching rides OR rides accepted by this provider
    const { data, error } = await supabase
      .from('ride_bookings')
      .select(`*`)
      .or(`status.eq.searching,provider_business_id.eq.${activeId}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch customer profiles manually to avoid join errors
      const ridesWithCustomers = await Promise.all(
        data.map(async (ride: any) => {
          if (ride.customer_id) {
            const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', ride.customer_id).single();
            return { ...ride, customer: profile };
          }
          return { ...ride, customer: { full_name: 'Customer', phone: 'N/A' } };
        })
      );
      setRides(ridesWithCustomers);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRides();
    // Auto-refresh every 15 seconds for new requests
    const interval = setInterval(fetchRides, 15000);
    return () => clearInterval(interval);
  }, [activeId]);

  // --- 2. STATS CALCULATION (Dynamic) ---
  const stats = useMemo(() => {
    const myRides = rides.filter(r => r.provider_business_id === activeId);
    const completed = myRides.filter(r => r.status === 'completed');
    const pending = rides.filter(r => r.status === 'searching');
    
    const today = new Date().toISOString().split('T')[0];
    const todayEarnings = completed
      .filter(r => r.created_at.startsWith(today))
      .reduce((acc, curr) => acc + (curr.estimated_fare * 0.9), 0); // Assuming 10% platform fee
    
    const totalDistance = completed.reduce((acc, curr) => acc + Number(curr.distance_km || 0), 0);

    return {
      todayEarnings: Math.round(todayEarnings),
      completedRides: completed.length,
      pendingRequests: pending.length,
      totalDistance: totalDistance.toFixed(1),
      rating: 4.8 // Placeholder for future logic
    };
  }, [rides, activeId]);

  // --- 3. ATOMIC ACCEPT RIDE ---
  const acceptRide = async (rideId: string) => {
    // Generate random vehicle number for realism
    const vehicleNo = `UP-${Math.floor(10 + Math.random() * 89)}-AB-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // ATOMIC UPDATE: Only update if status is still 'searching'
    const { data, error } = await supabase
      .from('ride_bookings')
      .update({ 
        status: 'accepted', 
        provider_business_id: activeId,
        driver_vehicle_no: vehicleNo 
      })
      .eq('id', rideId)
      .eq('status', 'searching')
      .select();

    if (error || !data || data.length === 0) {
      alert("Sorry! This ride was already accepted by another driver.");
      fetchRides();
      return;
    }
    
    alert("Ride Accepted Successfully! Navigate to pickup.");
    fetchRides();
  };

  // --- 4. UPDATE STATUS (Arrived) ---
  const markArrived = async (rideId: string) => {
    const { error } = await supabase.from('ride_bookings').update({ status: 'arrived' }).eq('id', rideId);
    if (!error) fetchRides();
  };

  // --- 5. OPEN OTP MODAL ---
  const openOtpModal = (ride: Ride, action: 'start' | 'complete') => {
    setSelectedRide(ride);
    setOtpAction(action);
    setOtpInput('');
    setIsOtpModalOpen(true);
  };

  // --- 6. VERIFY OTP & UPDATE STATUS ---
  const handleVerifyOtp = async () => {
    if (!selectedRide) return;
    if (otpInput !== selectedRide.ride_otp) {
      return alert("Invalid OTP! Please ask customer again.");
    }

    const newStatus = otpAction === 'start' ? 'in_progress' : 'completed';
    
    const { error } = await supabase.from('ride_bookings').update({ status: newStatus }).eq('id', selectedRide.id);
    
    if (!error) {
      alert(otpAction === 'start' ? "Ride Started!" : "Ride Completed Successfully!");
      setIsOtpModalOpen(false);
      fetchRides();
    }
  };

  // --- 7. FILTER LOGIC ---
  const filteredRides = rides.filter(ride => {
    if (activeTab === 'all') return true;
    if (activeTab === 'new') return ride.status === 'searching';
    if (activeTab === 'accepted') return ride.status === 'accepted' || ride.status === 'arrived';
    if (activeTab === 'ongoing') return ride.status === 'in_progress';
    if (activeTab === 'completed') return ride.status === 'completed';
    return true;
  });
  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-24 font-sans">
      
      {/* 🔵 TOP HEADER */}
      <header className="bg-blue-600 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="px-5 pt-12 pb-6 relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center font-black text-xl shadow-inner">
                P
              </div>
              <div>
                <h1 className="text-lg font-bold">Welcome, Driver</h1>
                <div className="flex items-center gap-2 text-blue-100 text-xs mt-0.5">
                  <span className="flex items-center gap-1">⭐ {stats.rating}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online</span>
                </div>
              </div>
            </div>
            <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center relative">
              🔔
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-blue-600"></span>
            </button>
          </div>

          {/* 📊 EARNINGS SUMMARY CARD */}
          <div className="bg-white rounded-2xl p-4 shadow-md text-gray-800 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Today's Earnings</p>
              <h2 className="text-2xl font-black text-blue-700 mt-1">₹{stats.todayEarnings}</h2>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-800">{stats.completedRides}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Rides</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-500">{stats.pendingRequests}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Requests</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 🎯 FILTER TABS */}
      <div className="max-w-2xl mx-auto mt-4 px-2">
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'new', label: `New (${stats.pendingRequests})` },
            { id: 'accepted', label: 'Accepted' },
            { id: 'ongoing', label: 'Ongoing' },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🛵 RIDE CARDS LIST */}
      <div className="max-w-2xl mx-auto px-4 mt-2 space-y-4">
        {loading && rides.length === 0 ? (
          <p className="text-center font-bold text-blue-600 py-10">Loading Requests...</p>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 mt-4">
            <div className="text-5xl mb-3">🛵</div>
            <p className="text-gray-800 font-bold text-lg">No rides found in this category.</p>
            <p className="text-gray-500 text-sm mt-1">Wait for new requests...</p>
          </div>
        ) : (
          filteredRides.map((ride) => (
            <div key={ride.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                    {ride.ride_type === 'bike' ? '🏍️' : ride.ride_type === 'auto' ? '🛺' : ride.ride_type === 'car' ? '🚗' : '📦'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 capitalize text-sm">{ride.ride_type} Request</h3>
                    <p className="text-[10px] text-gray-500">{new Date(ride.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase ${
                  ride.status === 'searching' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                  ride.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                  ride.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                  'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {ride.status.replace('_', ' ')}
                </span>
              </div>

              {/* Customer Info */}
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Customer</p>
                    <h4 className="font-bold text-gray-800">{ride.customer?.full_name || 'Customer'}</h4>
                    {ride.status !== 'searching' && (
                      <p className="text-xs text-blue-600 font-semibold mt-0.5">📞 {ride.customer?.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Fare</p>
                    <h4 className="text-lg font-black text-gray-900">₹{ride.estimated_fare}</h4>
                    <p className="text-[10px] text-green-600 font-bold">You get: ₹{Math.round(ride.estimated_fare * 0.9)}</p>
                  </div>
                </div>

                {/* Route */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 relative">
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-300"></div>
                  <div className="flex items-center gap-3 mb-2 relative z-10">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{ride.pickup_location}</p>
                  </div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{ride.drop_location}</p>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-gray-600 font-bold bg-blue-50 p-2 rounded-lg">
                  <span>Distance: {ride.distance_km} KM</span>
                  <span>Payment: Cash</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {ride.status === 'searching' && (
                    <>
                      <button onClick={() => alert('Rejected')} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold border border-red-100">Reject</button>
                      <button onClick={() => acceptRide(ride.id)} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md">Accept Ride</button>
                    </>
                  )}
                  {ride.status === 'accepted' && (
                    <button onClick={() => markArrived(ride.id)} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-md">Mark Arrived at Pickup</button>
                  )}
                  {ride.status === 'arrived' && (
                    <button onClick={() => openOtpModal(ride, 'start')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md">Verify OTP & Start</button>
                  )}
                  {ride.status === 'in_progress' && (
                    <button onClick={() => openOtpModal(ride, 'complete')} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md">Verify OTP & Complete</button>
                  )}
                  {ride.status === 'completed' && (
                    <div className="w-full text-center py-2 bg-green-50 text-green-700 rounded-xl font-bold border border-green-200">✓ Ride Completed</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 📱 BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <div className="flex flex-col items-center gap-1 text-blue-600">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">🛵</span>
          <span className="text-[10px] font-medium">Requests</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">💰</span>
          <span className="text-[10px] font-medium">Earnings</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">📜</span>
          <span className="text-[10px] font-medium">History</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </div>
      </nav>

      {/* ================= OTP VERIFICATION MODAL ================= */}
      {isOtpModalOpen && selectedRide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-[60] sm:items-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
                🔐
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                {otpAction === 'start' ? 'Start Ride' : 'Complete Ride'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Ask customer for their 4-digit OTP</p>
            </div>
            
            <input 
              type="text" 
              placeholder="• • • •" 
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              maxLength={4}
              className="w-full p-4 border-2 border-gray-300 rounded-2xl outline-none focus:border-blue-500 text-center text-3xl font-black tracking-[0.5em]"
            />

            <div className="flex gap-3">
              <button onClick={() => setIsOtpModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleVerifyOtp} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white shadow-md">Verify</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}