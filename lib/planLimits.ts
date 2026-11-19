export type PlanLimitConfig = {
  planName: string;
  maxWorkers: number;
  maxBusinesses: number;
  caAccess: boolean;
  multiBranch: boolean;
  isExpired: boolean;
};

export async function getUserPlanLimits(supabase: any, userId: string): Promise<PlanLimitConfig> {
  const { data: bizList } = await supabase
    .from('businesses')
    .select('id, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true });

  const bizIds = (bizList || []).map((b: any) => b.id);
  let query = supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
  if (bizIds.length > 0) {
    query = query.or(`owner_id.eq.${userId},business_id.in.(${bizIds.join(',')})`);
  } else {
    query = query.eq('owner_id', userId);
  }

  const { data: subList } = await query;
  const activeSub = (subList || []).find((s: any) => s.status?.toLowerCase() === 'active');

  let code = 'TRIAL';
  let isExpired = false;

  if (activeSub) {
    const exp = new Date(activeSub.current_period_end).getTime();
    if (exp > Date.now()) {
      code = (activeSub.plan_code || 'BASIC').toUpperCase();
    } else {
      code = 'EXPIRED';
      isExpired = true;
    }
  } else if (bizList && bizList.length > 0) {
    const start = new Date(bizList[0].created_at).getTime();
    const daysPassed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
    if (daysPassed >= 15) {
      code = 'EXPIRED';
      isExpired = true;
    }
  }

  if (code.includes('ENTERPRISE')) {
    return { planName: 'Enterprise', maxWorkers: 30, maxBusinesses: 10, caAccess: true, multiBranch: true, isExpired: false };
  }
  if (code.includes('PREMIUM')) {
    return { planName: 'Premium', maxWorkers: 15, maxBusinesses: 5, caAccess: true, multiBranch: true, isExpired: false };
  }
  if (code.includes('STANDARD')) {
    return { planName: 'Standard', maxWorkers: 5, maxBusinesses: 2, caAccess: true, multiBranch: true, isExpired: false };
  }
  if (code.includes('BASIC')) {
    return { planName: 'Basic', maxWorkers: 2, maxBusinesses: 1, caAccess: false, multiBranch: false, isExpired: false };
  }
  if (isExpired) {
    return { planName: 'Expired', maxWorkers: 0, maxBusinesses: 1, caAccess: false, multiBranch: false, isExpired: true };
  }
  return { planName: 'Trial', maxWorkers: 2, maxBusinesses: 1, caAccess: false, multiBranch: false, isExpired: false };
}
