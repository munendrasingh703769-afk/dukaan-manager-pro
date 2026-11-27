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

function calcRoadKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const straightKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  return Math.max(1, Math.round(straightKm * 1.22 * 10) / 10);
}

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
          const res = await fetch(
            `https://bigdatacloud.net{lat}&longitude=${lng}&localityLanguage=en`
          );
          const data = await res.json();
          const placeName = [data?.locality || data?.city, data?.principalSubdivision]
            .filter(Boolean)
            .join(', ');
          setPickup(placeName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
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

  useEffect(() => {
    const cleanDrop = drop.trim();
    if (cleanDrop.length < 3 || !pickup.trim() || pickup.includes('Detecting')) return;

    const timer = setTimeout(async () => {
      setCalcLoading(true);
      try {
        let pCoord = pickupCoords;
        if (!pCoord) {
          const pQuery = pickup.split(',').at(0)?.trim() || pickup;
          const pRes = await fetch(
            `https://open-meteo.com{encodeURIComponent(pQuery)}&count=1&language=en&format=json`
          );
          const pData = await pRes.json();
          const firstP = Array.isArray(pData?.results) ? pData.results.at(0) : null;
          if (firstP) {
            pCoord = { lat: Number(firstP.latitude), lng: Number(firstP.longitude) };
            setPickupCoords(pCoord);
          }
        }

        const dQuery = cleanDrop.split(',').at(0)?.trim() || cleanDrop;
        const dRes = await fetch(
          `https://open-meteo.com{encodeURIComponent(dQuery)}&count=1&language=en&format=json`
        );
        const dData = await dRes.json();
        const firstD = Array.isArray(dData?.results) ? dData.results.at(0) : null;

        if (firstD) {
          const dCoord = { lat: Number(firstD.latitude), lng: Number(firstD.longitude) };
          setDropCoords(dCoord);
          if (pCoord) {
            const km = calcRoadKm(pCoord.lat, pCoord.lng, dCoord.lat, dCoord.lng);
            setDistance(String(km));
          }
        }
      } catch {}
      setCalcLoading(false);
    }, 600);

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

  const mapsRouteLink =
    pickupCoords && dropCoords
      ? `https://google.com{pickupCoords.lat},${pickupCoords.lng}&destination=${dropCoords.lat},${dropCoords.lng}`
      : pickupCoords
      ? `https://google.com{pickupCoords.lat},${pickupCoords.lng}`
      : `https://google.com{encodeURIComponent(drop || pickup || 'Bareilly')}`;

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
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold flex items-center gap-2 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              {pickupCoords ? 'Live GPS Connected' : 'GPS Standby'}
            </span>
            <button type="button" onClick={detectCurrentLocation} disabled={locating} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold">
              {locating ? 'Locating...' : 'Refresh GPS'}
            </button>
          </div>

          <div className="bg-slate-800/90 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold">PICKUP (AUTO-GPS)</p>
                <p className="font-extrabold text-white truncate">{pickup || 'Enter Pickup'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold">DROP DESTINATION</p>
                <p className="font-extrabold text-white truncate">{drop || 'Type destination below...'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] text-slate-400 font-bold">ESTIMATED DISTANCE</p>
              <p className="text-base font-black text-amber-400">{kmNum > 0 ? `${kmNum} KM` : '-- KM'}</p>
            </div>
            <a href={mapsRouteLink} className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow">
             Open Live Route Map
           </a>
          </div>
        </div>

        <form onSubmit={handleBookRide} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-extrabold text-emerald-700 block mb-1">Current Pickup Location (Auto-GPS)</label>
              <input required value={pickup} onChange={(e) => { setPickup(e.target.value); setPickupCoords(null); }} placeholder="Current Location..." className="w-full p-3 border border-emerald-200 bg-emerald-50/40 rounded-xl text-sm font-semibold" />
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-red-700 block mb-1">Drop Location (City / Colony / Area likhein)</label>
              <input required value={drop} onChange={(e) => { setDrop(e.target.value); setDropCoords(null); }} placeholder="Jaise: Budaun ya Faridpur..." className="w-full p-3 border rounded-xl text-sm font-semibold" />
            </div>
            {calcLoading && (
              <p className="text-xs font-extrabold text-blue-600 animate-pulse">Calculating automatic distance...</p>
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