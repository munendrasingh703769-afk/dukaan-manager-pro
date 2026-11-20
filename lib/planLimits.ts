export type AlertLevel = 'green' | 'red' | 'urgent' | 'critical' | 'expired';

export type SubscriptionDetails = {
  planCode: string;
  planName: string;
  status: 'Active' | 'Trial' | 'Expired';
  startDateFormatted: string;
  expiryDateFormatted: string;
  totalValidityDays: number;
  remainingDays: number;
  remainingMonths: number;
  alertLevel: AlertLevel;
  isExpired: boolean;
  isTrial: boolean;
  maxWorkers: number;
  maxBusinesses: number;
  caAccess: boolean;
  multiBranch: boolean;
};

function formatDateIN(dateObj: Date): string {
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getAlertLevel(days: number, isExpired: boolean): AlertLevel {
  if (isExpired || days <= 0) return 'expired';
  if (days === 1) return 'critical';
  if (days <= 4) return 'urgent';
  if (days === 5) return 'red';
  return 'green';
}

export async function getSubscriptionDetails(
  supabase: any,
  userId: string,
  roleType: 'owner' | 'provider' | 'customer' = 'owner'
): Promise<SubscriptionDetails> {
  const { data: bizList } = await supabase
    .from('businesses')
    .select('id, created_at, trial_start_date, trial_ends_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true });

  const bizIds = (bizList || []).map((b: any) => b.id);
  let query = supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (bizIds.length > 0) {
    query = query.or(`owner_id.eq.${userId},business_id.in.(${bizIds.join(',')})`);
  } else {
    query = query.eq('owner_id', userId);
  }

  const { data: subList } = await query;
  const activeSub = (subList || []).find(
    (s: any) => (s.status || '').toLowerCase() === 'active'
  );

  const now = Date.now();
  const DAY_MS = 1000 * 60 * 60 * 24;

  let planCode = 'TRIAL';
  let status: 'Active' | 'Trial' | 'Expired' = 'Trial';
  let startObj = new Date();
  let expObj = new Date(now + 15 * DAY_MS);
  let totalValidityDays = 15;
  let remainingDays = 15;
  let isExpired = false;
  let isTrial = true;

  if (activeSub) {
    isTrial = false;
    planCode = (activeSub.plan_code || 'BASIC').toUpperCase();
    const defaultDays = planCode.includes('1Y') ? 365 : planCode.includes('3M') ? 90 : 30;
    const rawStart = activeSub.current_period_start || activeSub.created_at;
    startObj = rawStart ? new Date(rawStart) : new Date();

    const rawEnd = activeSub.current_period_end;
    expObj = rawEnd
      ? new Date(rawEnd)
      : new Date(startObj.getTime() + defaultDays * DAY_MS);

    totalValidityDays = Math.max(
      1,
      Math.round((expObj.getTime() - startObj.getTime()) / DAY_MS)
    );
    const diffMs = expObj.getTime() - now;

    if (diffMs > 0) {
      status = 'Active';
      remainingDays = Math.ceil(diffMs / DAY_MS);
      isExpired = false;
    } else {
      status = 'Expired';
      remainingDays = 0;
      isExpired = true;
    }
  } else {
    const firstBiz = bizList && bizList.length > 0 ? bizList[0] : null;
    const rawStart = firstBiz?.trial_start_date || firstBiz?.created_at;
    startObj = rawStart ? new Date(rawStart) : new Date();
    const rawEnd = firstBiz?.trial_ends_at;
    expObj = rawEnd ? new Date(rawEnd) : new Date(startObj.getTime() + 15 * DAY_MS);

    totalValidityDays = Math.max(
      1,
      Math.round((expObj.getTime() - startObj.getTime()) / DAY_MS)
    );
    const diffMs = expObj.getTime() - now;

    if (diffMs > 0) {
      status = 'Trial';
      remainingDays = Math.ceil(diffMs / DAY_MS);
      isExpired = false;
    } else {
      status = 'Expired';
      remainingDays = 0;
      isExpired = true;
      planCode = 'EXPIRED';
    }
  }

  let planName = 'Free Trial';
  let maxWorkers = 2;
  let maxBusinesses = 1;
  let caAccess = false;
  let multiBranch = false;

  if (isExpired) {
    planName = 'Plan Expired';
    maxWorkers = 0;
    maxBusinesses = 1;
  } else if (!isTrial) {
    if (planCode.includes('ENTERPRISE')) {
      planName = 'Enterprise Plan';
      maxWorkers = 30;
      maxBusinesses = 10;
      caAccess = true;
      multiBranch = true;
    } else if (planCode.includes('PREMIUM') || planCode.includes('PRO')) {
      planName = roleType === 'provider' ? 'Provider Pro Plan' : 'Premium Plan';
      maxWorkers = 15;
      maxBusinesses = 5;
      caAccess = true;
      multiBranch = true;
    } else if (planCode.includes('STANDARD') || planCode.includes('GROWTH')) {
      planName = roleType === 'provider' ? 'Provider Growth Plan' : 'Standard Plan';
      maxWorkers = 5;
      maxBusinesses = 2;
      caAccess = true;
      multiBranch = true;
    } else {
      planName =
        roleType === 'provider'
          ? 'Provider Starter Plan'
          : roleType === 'customer'
          ? 'Customer Plus Plan'
          : 'Basic Plan';
      maxWorkers = 2;
      maxBusinesses = 1;
      caAccess = false;
      multiBranch = false;
    }
  }

  return {
    planCode,
    planName,
    status,
    startDateFormatted: formatDateIN(startObj),
    expiryDateFormatted: formatDateIN(expObj),
    totalValidityDays,
    remainingDays,
    remainingMonths: Math.floor(remainingDays / 30),
    alertLevel: getAlertLevel(remainingDays, isExpired),
    isExpired,
    isTrial,
    maxWorkers,
    maxBusinesses,
    caAccess,
    multiBranch,
  };
}

export type PlanLimitConfig = {
  planName: string;
  maxWorkers: number;
  maxBusinesses: number;
  caAccess: boolean;
  multiBranch: boolean;
  isExpired: boolean;
};

export async function getUserPlanLimits(
  supabase: any,
  userId: string
): Promise<PlanLimitConfig> {
  const details = await getSubscriptionDetails(supabase, userId, 'owner');
  return {
    planName: details.planName,
    maxWorkers: details.maxWorkers,
    maxBusinesses: details.maxBusinesses,
    caAccess: details.caAccess,
    multiBranch: details.multiBranch,
    isExpired: details.isExpired,
  };
}
