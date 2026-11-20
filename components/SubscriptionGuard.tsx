'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getSubscriptionDetails, SubscriptionDetails } from '@/lib/planLimits';

export default function SubscriptionGuard({
  children,
  roleType = 'owner',
}: {
  children: React.ReactNode;
  roleType?: 'owner' | 'provider' | 'customer';
}) {
  const [sub, setSub] = useState<SubscriptionDetails | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const details = await getSubscriptionDetails(supabase, user.id, roleType);
        setSub(details);
      }
      setChecking(false);
    };
    check();
  }, [roleType]);

  if (checking) return <>{children}</>;

  if (sub?.isExpired) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-200 p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Plan Expired</h2>
          <p className="text-sm text-slate-600">
            Aapka subscription ({sub.expiryDateFormatted}) ko expire ho gaya hai. Aapka sara business data surakshit hai, lekin paid features lock kar diye gaye hain.
          </p>
          <Link
            href={roleType === 'provider' ? '/provider/plans' : '/pricing'}
            className="block w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 rounded-xl shadow-sm"
          >
            Renew / Upgrade Plan →
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
