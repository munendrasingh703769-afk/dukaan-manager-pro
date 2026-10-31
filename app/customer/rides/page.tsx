'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerRidesPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [rideType, setRideType] = useState('bike')
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [distance, setDistance] = useState<string>('') 
  const [loading, setLoading] = useState(false)

  const calculateFare = (): number => {
    const km = parseFloat(distance);
    if (isNaN(km) || km <= 0) return 0;
    switch (rideType) {
      case 'bike': return 20 + (km * 8);
      case 'auto': return 30 + (km * 12);
      case 'car': return 50 + (km * 18);
      case 'parcel': return 40 + (km * 15);
      default: return 0;
    }
  };

  const estimatedFare = calculateFare();

  const handleBookRide = async () => {
    if (!pickup || !drop || !distance) return alert("Please fill all details");
    setLoading(true);

    // 👇 Check karein ki user login hai ya nahi
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return alert("Aap login nahi hain! Ride book karne ke liye pehle login karein.");
    }

    const rideOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const { error } = await supabase.from('ride_bookings').insert([{
      customer_id: user.id, // 👈 Direct user ID
      ride_type: rideType,
      pickup_location: pickup,
      drop_location: drop,
      distance_km: parseFloat(distance),
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
              <input type="text" placeholder="Pickup Location" value={pickup} onChange={e => setPickup(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full z-10 border-2 border-white shadow"></div>
              <input type="text" placeholder="Drop Location" value={drop} onChange={e => setDrop(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium" />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">Distance (in KM) *</label>
            <input type="number" placeholder="e.g. 5" value={distance} onChange={e => setDistance(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium mt-1" />
          </div>

          <div className="mt-4">
            <p className="text-sm font-bold text-gray-700 mb-2">Choose Ride Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setRideType('bike')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'bike' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">🏍️</span><span className="text-xs font-bold">Bike (₹20 + ₹8/km)</span>
              </button>
              <button onClick={() => setRideType('auto')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'auto' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">🛺</span><span className="text-xs font-bold">Auto (₹30 + ₹12/km)</span>
              </button>
              <button onClick={() => setRideType('car')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'car' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">🚗</span><span className="text-xs font-bold">Car (₹50 + ₹18/km)</span>
              </button>
              <button onClick={() => setRideType('parcel')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'parcel' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">📦</span><span className="text-xs font-bold">Parcel (₹40 + ₹15/km)</span>
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
            <span className="font-bold text-indigo-900">Estimated Fare:</span>
            <span className="text-2xl font-black text-indigo-600">₹{estimatedFare}</span>
          </div>

          <button onClick={handleBookRide} disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-indigo-700 transition mt-4 disabled:opacity-50">
            {loading ? 'Processing...' : `Book ${rideType.charAt(0).toUpperCase() + rideType.slice(1)}`}
          </button>
        </div>
      </div>
    </div>
  )
}