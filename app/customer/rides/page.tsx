'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import RapidoMap from '@/components/RapidoMap';

const RIDE_TYPES = [
  { id: 'bike', name: 'Bike', tag: 'FASTEST', desc: 'Comfortable bike rides across city', base: 20, perKm: 8, emoji: '🏍️' },
  { id: 'auto', name: 'Auto', tag: 'COMFY', desc: 'Doorstep auto pickup', base: 30, perKm: 12, emoji: '🛺' },
  { id: 'car', name: 'Car', tag: 'AC RIDE', desc: 'Spacious family & intercity cab', base: 50, perKm: 18, emoji: '🚗' },
  { id: 'parcel', name: 'Parcel', tag: 'EXPRESS', desc: 'Fast local package delivery', base: 40, perKm: 15, emoji: '📦' },
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
  return Math.max(1, Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 1.22 * 10) / 10);
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
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  const detectCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setPickup(''); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPickupCoords({ lat, lng });
        try {
          const res = await fetch(`https://bigdatacloud.net{lat}&longitude=${lng}&localityLanguage=en`);
          const data = await res.json();
          const placeName = [data?.locality || data?.city, data?.principalSubdivision].filter(Boolean).join(', ');
          setPickup(placeName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          setPickup(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => { setPickup(''); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { detectCurrentLocation(); }, []);

  useEffect(() => {
    const cleanDrop = drop.trim();
    if (cleanDrop.length < 3 || !pickup.trim() || pickup.includes('Detecting')) return;

    const timer = setTimeout(async () => {
      setCalcLoading(true);
      try {
        let pCoord = pickupCoords;
        if (!pCoord) {
          const pQuery = pickup.split(',').at(0)?.trim() || pickup;
          const pRes = await fetch(`https://open-meteo.com{encodeURIComponent(pQuery)}&count=1&language=en&format=json`);
          const pData = await pRes.json();
          const firstP = Array.isArray(pData?.results) ? pData.results.at(0) : null;
          if (firstP) {
            pCoord = { lat: Number(firstP.latitude), lng: Number(firstP.longitude) };
            setPickupCoords(pCoord);
          }
        }

        const dQuery = cleanDrop.split(',').at(0)?.trim() || cleanDrop;
        const dRes = await fetch(`https://open-meteo.com{encodeURIComponent(dQuery)}&count=1&language=en&format=json`);
        const dData = await dRes.json();
        const firstD = Array.isArray(dData?.results) ? dData.results.at(0) : null;

        if (firstD) {
          const dCoord = { lat: Number(firstD.latitude), lng: Number(firstD.longitude) };
          setDropCoords(dCoord);
          if (pCoord) {
            setDistance(String(calcRoadKm(pCoord.lat, pCoord.lng, dCoord.lat, dCoord.lng)));
            try {
              const rRes = await fetch(`https://project-osrm.org{pCoord.lng},${pCoord.lat};${dCoord.lng},${dCoord.lat}?overview=full&geometries=geojson`);
              const rData = await rRes.json();
              const r0 = Array.isArray(rData?.routes) ? rData.routes.at(0) : null;
              if (r0?.distance) setDistance(String(Math.max(1, Math.round((r0.distance / 1000) * 10) / 10)));
              if (Array.isArray(r0?.geometry?.coordinates)) {
                setRouteCoords(r0.geometry.coordinates.map((c: number[]) => [c.at(1)!, c.at(0)!]));
              }
            } catch {}
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

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      {/* Top Map Section (Rapido Style with Green/Red Pins & Road Route Line) */}
      <div className="relative">
        <RapidoMap pickup={pickupCoords} drop={dropCoords} routeCoords={routeCoords} />
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
          <Link href="/customer" className="px-3 py-1.5 bg-white/95 text-slate-900 rounded-full text-xs font-extrabold shadow">
            ← Home
          </Link>
          <div className="flex gap-2">
            <button type="button" onClick={detectCurrentLocation} disabled={locating} className="px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-extrabold shadow">
              {locating ? 'Locating...' : 'My GPS'}
            </button>
            <Link href="/customer/my-rides" className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-extrabold shadow">
              My Rides
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Rapido-style Booking Sheet */}
      <form onSubmit={handleBookRide} className="max-w-md mx-auto -mt-4 relative z-10 bg-white rounded-t-3xl shadow-xl border-t border-slate-200 p-4 space-y-3.5">
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
            <input required value={pickup} onChange={(e) => { setPickup(e.target.value); setPickupCoords(null); }} placeholder="Current Pickup Location" className="w-full bg-transparent text-xs font-extrabold text-slate-800 outline-none" />
          </div>
          <div className="border-t border-slate-200" />
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
            <input required value={drop} onChange={(e) => { setDrop(e.target.value); setDropCoords(null); setRouteCoords([]); }} placeholder="Where to? (e.g. Budaun, Faridpur...)" className="w-full bg-transparent text-xs font-extrabold text-slate-900 outline-none" />
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-slate-500">
            {calcLoading ? 'Calculating route & KM...' : kmNum > 0 ? `Route Distance: ${kmNum} KM` : 'Enter drop to see route'}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500">KM:</span>
            <input required type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-16 px-2 py-1 border rounded-lg text-xs font-black text-right bg-slate-50" />
          </div>
        </div>

        {/* Rapido-style Ride Cards */}
        <div className="space-y-2">
          {RIDE_TYPES.map((rt) => {
            const cardFare = kmNum > 0 ? Math.round(rt.base + kmNum * rt.perKm) : rt.base;
            const active = selectedType.id === rt.id;
            return (
              <button
                type="button"
                key={rt.id}
                onClick={() => setSelectedType(rt)}
                className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between text-left transition ${
                  active ? 'border-slate-900 bg-amber-50/50 shadow-sm' : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rt.emoji}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-slate-900">{rt.name}</span>
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-extrabold">{rt.tag}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{rt.desc}</p>
                  </div>
                </div>
                <span className="text-base font-black text-slate-900">₹{cardFare}</span>
              </button>
            );
          })}
        </div>

        {/* Rapido Signature Yellow Book Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl text-sm font-black shadow-md"
        >
          {loading ? 'Booking Ride...' : `Book ${selectedType.name} • ₹${estimatedFare}`}
        </button>
      </form>
    </div>
  );
}