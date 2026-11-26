'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LiveGpsBroadcaster({
  table,
  recordId,
  active,
  label = 'Live GPS Tracking Active',
}: {
  table: 'ride_bookings' | 'orders' | 'service_bookings';
  recordId: string;
  active: boolean;
  label?: string;
}) {
  const supabase = createClient();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string>('');

  useEffect(() => {
    if (!active || !recordId || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const sendLocation = async (lat: number, lng: number) => {
      setCoords({ lat, lng });
      await supabase
        .from(table)
        .update({
          driver_lat: lat,
          driver_lng: lng,
          location_updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError('');
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsError(err.message || 'GPS permission chahiye');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, recordId, table]);

  if (!active) return null;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-emerald-800 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping inline-block" />
          {label}
        </span>
        {coords && (
          <span className="text-[10px] font-bold text-emerald-700">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
        )}
      </div>
      {gpsError && <p className="text-[11px] text-red-600 font-semibold">GPS Alert: {gpsError}</p>}
    </div>
  );
}

export function CustomerLiveMap({
  table,
  recordId,
  title = 'Live Rider / Delivery Location',
}: {
  table: 'ride_bookings' | 'orders' | 'service_bookings';
  recordId: string;
  title?: string;
}) {
  const supabase = createClient();
  const [loc, setLoc] = useState<{ lat: number; lng: number; updated?: string } | null>(null);

  useEffect(() => {
    if (!recordId) return;

    const fetchLoc = async () => {
      const { data } = await supabase
        .from(table)
        .select('driver_lat, driver_lng, location_updated_at')
        .eq('id', recordId)
        .maybeSingle();

      if (data?.driver_lat && data?.driver_lng) {
        setLoc({
          lat: Number(data.driver_lat),
          lng: Number(data.driver_lng),
          updated: data.location_updated_at,
        });
      }
    };

    fetchLoc();
    const timer = setInterval(fetchLoc, 5000);
    return () => clearInterval(timer);
  }, [table, recordId]);

  if (!loc) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 font-bold">
        Live GPS signal ka intezar hai... Jaise hi rider/partner niklega, live map yahan dikhega.
      </div>
    );
  }

  const bbox = `${loc.lng - 0.008},${loc.lat - 0.008},${loc.lng + 0.008},${loc.lat + 0.008}`;
  const mapUrl = `https://openstreetmap.org{bbox}&layer=mapnik&marker=${loc.lat},${loc.lng}`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-2">
      <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-xs">
        <span className="font-extrabold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          {title}
        </span>
        <a
          href={`https://google.com{loc.lat},${loc.lng}`}
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1 bg-blue-600 rounded-lg text-[10px] font-bold"
        >
          Open Full Map
        </a>
      </div>
      <iframe
        title="Live Tracking Map"
        src={mapUrl}
        className="w-full h-52 border-0"
        loading="lazy"
      />
      {loc.updated && (
        <p className="px-3 pb-2 text-[10px] text-slate-500 font-semibold">
          Last GPS Update: {new Date(loc.updated).toLocaleTimeString('en-IN')} (Auto-refresh every 5s)
        </p>
      )}
    </div>
  );
}
