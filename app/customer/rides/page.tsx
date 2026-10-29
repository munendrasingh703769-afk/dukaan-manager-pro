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
  const [loading, setLoading] = useState(false)

  const handleBookRide = async () => {
    if (!pickup || !drop) return alert("Please enter pickup and drop location");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    // Dummy fare calculation
    const fare = rideType === 'bike' ? 50 : rideType === 'auto' ? 80 : rideType === 'car' ? 150 : 100;

    const { error } = await supabase.from('ride_bookings').insert([{
      customer_id: user?.id || null,
      ride_type: rideType,
      pickup_location: pickup,
      drop_location: drop,
      estimated_fare: fare,
      status: 'searching'
    }]);

    if (!error) {
      alert(`Searching for a ${rideType.toUpperCase()}... Fare: ₹${fare}`);
      router.push('/customer');
    } else {
      alert("Error: " + error.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Rides & Transport</h1>
        <Link href="/customer" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">← Home</Link>
      </div>

      <div className="p-4 max-w-2xl mx-auto mt-4">
        {/* Map Placeholder */}
        <div className="w-full h-48 bg-gray-200 rounded-2xl mb-4 flex items-center justify-center border border-gray-300 relative overflow-hidden">
           <p className="text-gray-500 font-bold text-sm">Map View (Coming Soon)</p>
           <div className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow text-xs font-bold">📍 Current Location</div>
        </div>

        {/* Booking Form */}
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

          <div className="mt-4">
            <p className="text-sm font-bold text-gray-700 mb-2">Choose Ride Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setRideType('bike')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${rideType === 'bike' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                <span className="text-2xl">🏍️</span><span className="text-xs font-bold">Bike Taxi</span>
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

          <button onClick={handleBookRide} disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-indigo-700 transition mt-4 disabled:opacity-50">
            {loading ? 'Processing...' : `Book ${rideType.charAt(0).toUpperCase() + rideType.slice(1)}`}
          </button>
        </div>
      </div>
    </div>
  )
}