'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerRidesPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [rideType, setRideType] = useState('bike')
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Auto-calculated Distance & Fare
  const [calculatedKm, setCalculatedKm] = useState<number>(0);
  const [estimatedFare, setEstimatedFare] = useState<number>(0);
  const [calculating, setCalculating] = useState(false);

  // 🧠 REAL AUTO-DISTANCE LOGIC (Using OpenStreetMap & OSRM - Free APIs)
  useEffect(() => {
    // Jab tak address 4 letter ka na ho, calculate mat karo
    if (pickup.length < 4 || drop.length < 4) {
      setCalculatedKm(0);
      setEstimatedFare(0);
      return;
    }

    const timer = setTimeout(async () => {
      setCalculating(true);
      try {
        // 1. Pickup Location ka Latitude/Longitude dhundo
        const p1 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickup)}`).then(r => r.json());
        // 2. Drop Location ka Latitude/Longitude dhundo
        const p2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(drop)}`).then(r => r.json());

        if (p1.length > 0 && p2.length > 0) {
          const lat1 = p1[0].lat; 
          const lon1 = p1[0].lon;
          const lat2 = p2[0].lat; 
          const lon2 = p2[0].lon;
          
          // 3. OSRM API se real driving distance nikalo
          const route = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`).then(r => r.json());
          
          let realKm = 0;
          if (route.code === 'Ok' && route.routes.length > 0) {
            realKm = Math.round(route.routes[0].distance / 1000);
          } else {
            // Fallback: Agar OSRM fail ho jaye toh seedhi line ka distance (Haversine Formula)
            const R = 6371; // Earth radius in km
            const dLat = (Number(lat2) - Number(lat1)) * Math.PI / 180;
            const dLon = (Number(lon2) - Number(lon1)) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(Number(lat1) * Math.PI / 180) * Math.cos(Number(lat2) * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            realKm = Math.round(R * c);
          }

          // Ek minimum 2 KM set kar dete hain
          realKm = Math.max(2, realKm);
          setCalculatedKm(realKm);
        }
      } catch (error) {
        console.error("Distance calculation error:", error);
      } finally {
        setCalculating(false);
      }
    }, 1500); // 1.5 second wait karo taaki user type karna complete kare

    return () => clearTimeout(timer);
  }, [pickup, drop]);

  // Jab distance change ho, toh fare calculate karo
  useEffect(() => {
    if (calculatedKm > 0) {
      let fare = 0;
      switch (rideType) {
        case 'bike': fare = 20 + (calculatedKm * 8); break;
        case 'auto': fare = 30 + (calculatedKm * 12); break;
        case 'car': fare = 50 + (calculatedKm * 18); break;
        case 'parcel': fare = 40 + (calculatedKm * 15); break;
      }
      setEstimatedFare(Math.round(fare));
    }
  }, [calculatedKm, rideType]);

  const handleBookRide = async () => {
    if (!pickup || !drop) return alert("Please enter pickup and drop locations");
    if (calculatedKm === 0) return alert("Calculating distance, please wait...");
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return alert("Please login first.");
    }

    const rideOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const { error } = await supabase.from('ride_bookings').insert([{
      customer_id: user.id,
      ride_type: rideType,
      pickup_location: pickup,
      drop_location: drop,
      distance_km: calculatedKm,
      estimated_fare: estimatedFare,
      ride_otp: rideOtp,
      status: 'searching'
    }]);

    if (!error) {
      alert(`Ride Requested! Fare: ₹${estimatedFare}`);
      router.push('/customer/my-rides');
    } else {
      alert("Error: " + error.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Rides & Transport</h1>
        <div className="flex gap-2">
          <Link href="/customer/my-rides" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">My Rides</Link>
          <Link href="/customer" className="text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">Home</Link>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto mt-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          
          <div className="relative">
            <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full z-10 border-2 border-white shadow"></div>
              <input type="text" placeholder="Pickup Location (e.g. Bareilly)" value={pickup} onChange={e => setPickup(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full z-10 border-2 border-white shadow"></div>
              <input type="text" placeholder="Drop Location (e.g. Budaun)" value={drop} onChange={e => setDrop(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium" />
            </div>
          </div>

          {/* Auto Distance Display */}
          {calculating ? (
            <div className="bg-blue-50 text-blue-800 text-sm font-bold p-3 rounded-xl flex justify-between items-center animate-pulse">
              <span>🛣️ Calculating Real Distance...</span>
            </div>
          ) : calculatedKm > 0 ? (
            <div className="bg-green-50 text-green-800 text-sm font-bold p-3 rounded-xl flex justify-between items-center border border-green-200">
              <span>🛣️ Real Driving Distance:</span>
              <span>{calculatedKm} KM</span>
            </div>
          ) : null}

          <div className="mt-4">
            <p className="text-sm font-bold text-gray-700 mb-2">Choose Ride Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setRideType('bike')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'bike' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">🏍️</span><span className="text-xs font-bold">Bike</span>
              </button>
              <button onClick={() => setRideType('auto')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'auto' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">🛺</span><span className="text-xs font-bold">Auto</span>
              </button>
              <button onClick={() => setRideType('car')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'car' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">🚗</span><span className="text-xs font-bold">Car</span>
              </button>
              <button onClick={() => setRideType('parcel')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'parcel' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">📦</span><span className="text-xs font-bold">Parcel</span>
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
            <span className="font-bold text-indigo-900">Estimated Fare:</span>
            <span className="text-2xl font-black text-indigo-600">₹{estimatedFare}</span>
          </div>

          <button onClick={handleBookRide} disabled={loading || calculating || calculatedKm === 0} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-indigo-700 transition mt-4 disabled:opacity-50">
            {loading ? 'Searching...' : calculating ? 'Wait...' : `Book ${rideType.charAt(0).toUpperCase() + rideType.slice(1)}`}
          </button>
        </div>
      </div>
    </div>
  )
}