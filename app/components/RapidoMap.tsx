'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    L: any;
  }
}

export default function RapidoMap({
  pickup,
  drop,
  routeCoords,
}: {
  pickup: { lat: number; lng: number } | null;
  drop: { lat: number; lng: number } | null;
  routeCoords: [number, number][];
}) {
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    // Load Leaflet CSS & JS from CDN once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapBoxRef.current || !window.L) return;
      const L = window.L;

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      const center = pickup || drop || { lat: 28.367, lng: 79.4304 };
      const map = L.map(mapBoxRef.current, { zoomControl: false }).setView([center.lat, center.lng], 13);
      mapInstance.current = map;

      L.tileLayer('https://{s}://{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const greenPin = L.divIcon({
        html: '<div style="width:18px;height:18px;background:#16a34a;border:4px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
        className: '',
        iconSize:,
      });

      const redPin = L.divIcon({
        html: '<div style="width:18px;height:18px;background:#dc2626;border:4px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
        className: '',
        iconSize:,
      });

      const bounds: [number, number][] = [];

      if (pickup) {
        L.marker([pickup.lat, pickup.lng], { icon: greenPin }).addTo(map).bindPopup('Pickup Location');
        bounds.push([pickup.lat, pickup.lng]);
      }

      if (drop) {
        L.marker([drop.lat, drop.lng], { icon: redPin }).addTo(map).bindPopup('Drop Location');
        bounds.push([drop.lat, drop.lng]);
      }

      if (routeCoords.length > 1) {
        L.polyline(routeCoords, { color: '#111827', weight: 5, opacity: 0.9 }).addTo(map);
        map.fitBounds(routeCoords, { padding: [35, 35] });
      } else if (bounds.length === 2) {
        L.polyline(bounds, { color: '#111827', weight: 4, dashArray: '6,6' }).addTo(map);
        map.fitBounds(bounds, { padding: [40, 40] });
      } else if (bounds.length === 1) {
        map.setView(bounds.at(0)!, 14);
      }
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com';
      script.onload = initMap;
      document.body.appendChild(script);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [pickup, drop, routeCoords]);

  return <div ref={mapBoxRef} className="w-full h-72 z-0" />;
}