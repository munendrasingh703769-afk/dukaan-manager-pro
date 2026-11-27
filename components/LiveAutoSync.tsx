'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LiveAutoSync() {
  const router = useRouter();
  const supabase = createClient();
  const initialBuildId = useRef<string | null>(null);

  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const res = await fetch('/api/app-version?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!initialBuildId.current) {
          initialBuildId.current = data.version;
        } else if (data.version && initialBuildId.current !== data.version) {
          window.location.reload();
        }
      } catch {}
    };

    checkAppVersion();
    const timer = setInterval(checkAppVersion, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('vyapaarsetu-global-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_categories' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_bookings' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_bookings' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
