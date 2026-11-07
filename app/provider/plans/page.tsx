'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Plan = {
  id: string; plan_code: string; plan_name: string; price: number;
  duration_days: number; max_workers: number; features: any; 
}

export default function ProviderPlansPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Payment Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const UPI_ID = "9808651905@ybl";

  const fetchData = async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: planData } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('price', { ascending: true });
      if (planData) setPlans(planData);

      const { data: subData } = await supabase.from('subscriptions').select('*').eq('business_id', activeId).order('created_at', { ascending: false }).limit(1).maybeSingle();

      const { data: bizData } = await supabase.from('businesses').select('trial_ends_at').eq('id', activeId).single();

      if (subData) {
        setCurrentPlan({ ...subData, trial_ends_at: bizData?.trial_ends_at });
      } else if (bizData) {
        setCurrentPlan({ plan_code: 'trial', trial_ends_at: bizData.trial_ends_at });
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeId]);

  const openPaymentModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsPayModalOpen(true);
  };

  // 👇 User "I have paid" dabayega
  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

      // Status 'pending' rakha hai taaki Admin verify kare
      const { error } = await supabase.from('subscriptions').upsert([{
        business_id: activeId,
        plan_code: selectedPlan.plan_code,
        status: 'pending', // 👈 Yahan pending hai
        current_period_start: new Date().toISOString(),
        current_period_end: endDate.toISOString(),
        amount_paid: selectedPlan.price,
        payment_method: 'upi',
        payment_ref: `UPI-${Date.now()}`
      }], { onConflict: 'business_id' });

      if (error) throw error;
      
      alert("Payment details submitted! Admin will verify and activate your plan shortly.");
      setIsPayModalOpen(false);
      fetchData(); // Refresh to show 'pending' status
      
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getTrialDaysLeft = () => {
    if (!currentPlan?.trial_ends_at) return 0;
    const end = new Date(currentPlan.trial_ends_at).getTime();
    const now = new Date().getTime();
    const days = Math.ceil((end - now) / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  const getFeaturesList = (features: any) => {
    let list: string[] = [];
    if (features && typeof features === 'object' && !Array.isArray(features)) {
      Object.entries(features).forEach(([key, value]) => {
        if (value === true) list.push(key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      });
    } else if (Array.isArray(features)) {
      list = features;
    }
    return list;
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Plans...</div>;

  const isTrial = currentPlan?.plan_code === 'trial' || !currentPlan;
  const isPending = currentPlan?.status === 'pending';
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Subscription & Plans</h1>
          <p className="text-sm text-gray-500">Manage your billing and upgrade your business</p>
        </div>
        
        <div className={`${isPending ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'} border p-4 rounded-xl flex items-center gap-4`}>
          <div className={`w-12 h-12 ${isPending ? 'bg-orange-500' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-2xl shadow-inner`}>
            {isPending ? '⏳' : '🚀'}
          </div>
          <div>
            <p className={`text-xs ${isPending ? 'text-orange-600' : 'text-blue-600'} font-bold uppercase tracking-wider`}>Current Status</p>
            <h3 className={`text-lg font-black ${isPending ? 'text-orange-900' : 'text-blue-900'}`}>
              {isPending ? 'Payment Pending (Verification)' : (isTrial ? `Free Trial (${getTrialDaysLeft()} days left)` : plans.find(p => p.plan_code === currentPlan?.plan_code)?.plan_name)}
            </h3>
          </div>
        </div>
      </div>

      {/* PLANS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan) => {
          const isActive = currentPlan?.plan_code === plan.plan_code && currentPlan?.status === 'active';
          const isThisPending = currentPlan?.plan_code === plan.plan_code && currentPlan?.status === 'pending';
          const isPro = plan.plan_code === 'pro';

          return (
            <div key={plan.id} className={`bg-white rounded-3xl p-6 border-2 transition-all relative flex flex-col ${isPro ? 'border-blue-600 shadow-xl scale-105 z-10' : 'border-gray-100 shadow-sm'}`}>
              
              {isPro && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase">Most Popular</div>
              )}

              <div className="text-center mb-6 border-b border-gray-100 pb-6">
                <h3 className="text-lg font-bold text-gray-800">{plan.plan_name}</h3>
                <div className="mt-2 flex justify-center items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">₹{plan.price}</span>
                  <span className="text-sm text-gray-500 font-medium">/ {plan.duration_days} days</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {getFeaturesList(plan.features).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-green-500 font-bold mt-0.5">✓</span> {feature}</li>
                ))}
                <li className="flex items-start gap-2 text-sm text-gray-600"><span className="text-green-500 font-bold mt-0.5">✓</span> Max {plan.max_workers} Worker(s)</li>
              </ul>

              <button 
                onClick={() => openPaymentModal(plan)}
                disabled={isActive || isThisPending || isPending}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  isActive ? 'bg-green-50 text-green-700 border border-green-200 cursor-default' 
                  : isThisPending ? 'bg-orange-50 text-orange-700 border border-orange-200 cursor-default'
                  : isPro ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {isActive ? 'Current Active Plan' : isThisPending ? 'Verification Pending' : 'Upgrade Now'}
              </button>
            </div>
          );
        })}
      </div>

      {/* 👇 PAYMENT MODAL (UPI + I have paid) */}
      {isPayModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">💳</div>
              <h2 className="text-xl font-black text-gray-800">Complete Payment</h2>
              <p className="text-sm text-gray-500 mt-1">Upgrade to <b>{selectedPlan.plan_name}</b> for ₹{selectedPlan.price}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center space-y-2">
              <p className="text-xs text-gray-500 font-bold uppercase">Pay via any UPI App</p>
              <p className="font-mono text-2xl font-black text-gray-800 select-all">{UPI_ID}</p>
              <button 
                onClick={() => { navigator.clipboard.writeText(UPI_ID); alert("UPI ID Copied!"); }}
                className="text-xs bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg"
              >
                Copy UPI ID
              </button>
            </div>

            <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 text-xs text-yellow-800 font-medium text-center">
              Please transfer ₹{selectedPlan.price} to the above UPI ID. After payment, click the button below to notify Admin.
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={handleConfirmPayment} 
                disabled={submitting}
                className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-green-700 transition"
              >
                {submitting ? 'Submitting...' : 'I Have Paid (Notify Admin)'}
              </button>
              <button 
                onClick={() => setIsPayModalOpen(false)} 
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}