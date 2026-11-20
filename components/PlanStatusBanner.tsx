'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getSubscriptionDetails, SubscriptionDetails } from '@/lib/planLimits';

export default function PlanStatusBanner({
  roleType,
  upgradeHref,
}: {
  roleType: 'provider' | 'customer';
  upgradeHref: string;
}) {
  const [sub, setSub] = useState<SubscriptionDetails | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setSub(await getSubscriptionDetails(supabase, user.id, roleType));
      }
    };
    load();
  }, [roleType]);

  if (!sub) return null;

  return (
    <div className={`rounded-2xl p-4 shadow-sm border mb-4 ${
      sub.isExpired
        ? 'bg-red-50 border-red-300 text-red-950'
        : sub.alertLevel === 'red' || sub.alertLevel === 'urgent' || sub.alertLevel === 'critical'
        ? 'bg-rose-50 border-rose-300 text-rose-950'
        : sub.isTrial
        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
        : 'bg-slate-900 border-indigo-500/30 text-white'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold">{sub.planName}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase">
              {sub.status}
            </span>
          </div>
          <p className="text-[11px] opacity-80 mt-0.5">
            Valid till: {sub.expiryDateFormatted} • {sub.isExpired ? '0 Days Left' : `${sub.remainingDays} Days Left`}
          </p>
        </div>
        <Link href={upgradeHref} className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold">
          {sub.isExpired ? 'Renew →' : 'Plans →'}
        </Link>
      </div>
      {(sub.alertLevel === 'red' || sub.alertLevel === 'urgent' || sub.alertLevel === 'critical') && (
        <p className="mt-2 text-xs font-bold text-red-600">
          ⚠️ Alert: Sirf {sub.remainingDays} days remaining! Plan renew karein.
        </p>
      )}
    </div>
  );
}
