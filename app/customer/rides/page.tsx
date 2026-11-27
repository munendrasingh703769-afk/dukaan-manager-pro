'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const RIDE_TYPES = [
  { id: 'bike', name: 'Bike', base: 20, perKm: 8, emoji: '🏍️' },
  { id: 'auto', name: 'Auto', base: 30, perKm: 12, emoji: '🛺' },
  { id: 'car', name: 'Car', base: 50, perKm: 18, emoji: '🚗' },
  { id: 'parcel', name: 'Parcel', base: 40, perKm: 15, emoji: '📦' },
];

export default function CustomerRidesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [pickup, setPickup] = useState('Detecting current location...');
  const [drop, setDrop] = useState('');
  const [distance, setDistance] = useState('');
  const [selectedType, setSelectedType] = useState(RIDE_TYPES.at(0)!);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>(null);

  const detectCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPickup('');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPickupCoords({ lat, lng });
        try {
          const res = await fetch(`https://openstreetmap.org{lat}&lon=${lng}`);
          const data = await res.json();
          setPickup(data?.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          setPickup(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => {
        setPickup('');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  // Automatic distance calculation 1 second after typing Drop or Pickup
  useEffect(() => {
    if (!drop.trim() || drop.trim().length < 3 || !pickup.trim() || pickup.includes('Detecting')) return;

    const timer = setTimeout(async () => {
      setCalcLoading(true);
      try {
        let pCoord = pickupCoords;
        if (!pCoord) {
          const pRes = await fetch(`https://openstreetmap.org{encodeURIComponent(pickup + ', India')}&limit=1`);
          const pData = await pRes.json();
          const firstP = Array.isArray(pData) ? pData.at(0) : null;
          if (firstP) {
            pCoord = { lat: parseFloat(firstP.lat), lng: parseFloat(firstP.lon) };
            setPickupCoords(pCoord);
          }
        }

        const dRes = await fetch(`https://openstreetmap.org{encodeURIComponent(drop + ', India')}&limit=1`);
        const dData = await dRes.json();
        const firstD = Array.isArray(dData) ? dData.at(0) : null;
        let dCoord = null;
        if (firstD) {
          dCoord = { lat: parseFloat(firstD.lat), lng: parseFloat(firstD.lon) };
          setDropCoords(dCoord);
        }

        if (pCoord && dCoord) {
          const routeRes = await fetch(`https://project-osrm.org{pCoord.lng},${pCoord.lat};${dCoord.lng},${dCoord.lat}?overview=false`);
          const routeData = await routeRes.json();
          const firstRoute = Array.isArray(routeData?.routes) ? routeData.routes.at(0) : null;
          if (firstRoute?.distance) {
            setDistance(String(Math.max(1, Math.round((firstRoute.distance / 1000) * 10) / 10)));
          }
        }
      } catch {}
      setCalcLoading(false);
    }, 900);

    return () => clearTimeout(timer);
  }, [drop, pickup, pickupCoords]);

  const kmNum = Math.max(0, parseFloat(distance) || 0);
  const estimatedFare = kmNum > 0 ? Math.round(selectedType.base + kmNum * selectedType.perKm) : selectedType.base;

  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !drop.trim()) return alert('Pickup aur Drop location zaroori hai');
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { error } = await supabase.from('ride_bookings').insert([{
        customer_id: user.id,
        pickup_location: pickup.trim(),
        drop_location: drop.trim(),
        pickup_lat: pickupCoords?.lat || null,
        pickup_lng: pickupCoords?.lng || null,
        distance_km: kmNum || 1,
        ride_type: selectedType.name,
        fare: estimatedFare,
        status: 'pending',
      }]);
      if (error) throw error;
      alert(`${selectedType.name} Ride Book ho gayi!`);
      router.push('/customer/my-rides');
    } catch (err: any) {
      alert('Booking Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeMapCoord = dropCoords || pickupCoords || { lat: 28.3670, lng: 79.4304 };
  const mapUrl = `https://google.com{activeMapCoord.lat},${activeMapCoord.lng}&z=14&output=embed`;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-black text-slate-900">Rides &amp; Transport</h1>
        <div className="flex gap-2">
          <Link href="/customer/my-rides" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-extrabold">My Rides</Link>
          <Link href="/customer" className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Home</Link>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between text-xs">
            <span className="font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              {dropCoords ? 'Drop Location Live Map' : pickupCoords ? 'Your Current GPS Location' : 'Live GPS Map'}
            </span>
            <button type="button" onClick={detectCurrentLocation} disabled={locating} className="px-2.5 py-1 bg-emerald-600 rounded-lg text-[10px] font-extrabold">
              {locating ? 'Locating...' : 'Refresh GPS'}
            </button>
          </div>
          <iframe title="Live GPS Map" src={mapUrl} className="w-full h-48 border-0" />
        </div>

        <form onSubmit={handleBookRide} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-extrabold text-emerald-700 block mb-1">Current Pickup Location (Auto-GPS)</label>
              <input required value={pickup} onChange={(e) => { setPickup(e.target.value); setPickupCoords(null); }} placeholder="Current Location..." className="w-full p-3 border border-emerald-200 bg-emerald-50/40 rounded-xl text-sm font-semibold" />
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-red-700 block mb-1">Drop Location (City / Colony / Area likhein)</label>
              <input required value={drop} onChange={(e) => { setDrop(e.target.value); setDropCoords(null); }} placeholder="Jaise: Faridpur Bareilly ya Civil Lines..." className="w-full p-3 border rounded-xl text-sm font-semibold" />
            </div>
            {calcLoading && (
              <p className="text-xs font-extrabold text-blue-600 animate-pulse">Calculating automatic road distance...</p>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Auto-Calculated Distance (KM) *</label>
            <input required type="number" step="0.1" placeholder="Drop likhte hi apne aap aayega..." value={distance} onChange={(e) => setDistance(e.target.value)} className="w-full p-3 border rounded-xl text-sm font-black bg-slate-50 text-blue-700" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {RIDE_TYPES.map((rt) => (
              <button type="button" key={rt.id} onClick={() => setSelectedType(rt)} className={`p-3 rounded-xl border text-center ${selectedType.id === rt.id ? 'border-blue-600 bg-blue-50/70' : 'border-slate-200 bg-white'}`}>
                <div className="text-xl mb-1">{rt.emoji}</div>
                <div className="text-xs font-extrabold text-slate-800">{rt.name} (₹{rt.base} + ₹{rt.perKm}/km)</div>
              </button>
            ))}
          </div>

          <div className="bg-slate-100 p-3.5 rounded-xl flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700">Estimated Fare:</span>
            <span className="text-xl font-black text-blue-600">₹{estimatedFare}</span>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-sm font-extrabold shadow-md">
            {loading ? 'Booking...' : `Book ${selectedType.name}`}
          </button>
        </form>
      </div>
    </div>
  );
}
