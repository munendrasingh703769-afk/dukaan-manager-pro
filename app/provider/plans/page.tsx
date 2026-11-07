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
  const [upgrading, setUpgrading] = useState(false);

  const fetchData = async () => {
    if (!activeId) {
      setErrorMsg("Aapka account login nahi hai. Kripya logout karke dobara login karein.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Fetch all available plans
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
        
      if (planError) throw new Error(planError.message);
      if (planData) setPlans(planData);

      // 2. Fetch current subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', activeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) console.error("Subscription fetch error:", subError.message);

      // 3. Fetch trial details from business
      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('trial_start_date, trial_ends_at')
        .eq('id', activeId)
        .single();

      if (bizError) console.error("Business fetch error:", bizError.message);

      if (subData) {
        setCurrentPlan({ ...subData, trial_ends_at: bizData?.trial_ends_at });
      } else if (bizData) {
        setCurrentPlan({ plan_code: 'trial', trial_ends_at: bizData.trial_ends_at });
      }

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load plans. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeId]);

  const handleUpgrade = async (plan: Plan) => {
    if (plan.plan_code === currentPlan?.plan_code) return;
    if (!confirm(`Kya aap ${plan.plan_name} (₹${plan.price}) kharidna chahte hain?`)) return;
    
    setUpgrading(true);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);

    try {
      // UPSERT Fix for duplicate key error
      const { error } = await supabase.from('subscriptions').upsert([{
        business_id: activeId,
        plan_code: plan.plan_code,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: endDate.toISOString(),
        amount_paid: plan.price,
        payment_method: 'manual',
        payment_ref: `TXN-${Date.now()}`
      }], { onConflict: 'business_id' });

      if (error) throw new Error(error.message);
      
      alert("Payment Successful! Aapka plan activate ho gaya hai.");
      
      // 👇 REDIRECT TO DASHBOARD (Taaki blur turant hat jaye)
      window.location.href = '/provider'; 

    } catch (err: any) {
      alert("Error upgrading: " + err.message);
    } finally {
      setUpgrading(false);
    }
  };

  const getTrialDaysLeft = () => {
    if (!currentPlan?.trial_ends_at) return 0;
    const end = new Date(currentPlan.trial_ends_at).getTime();
    const now = new Date().getTime();
    const days = Math.ceil((end - now) / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  // SMART FEATURES LOGIC (Object to Array conversion)
  const getFeaturesList = (features: any) => {
    let list: string[] = [];
    
    if (features && typeof features === 'object' && !Array.isArray(features)) {
      Object.entries(features).forEach(([key, value]) => {
        if (value === true) {
          const formattedKey = key.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          list.push(formattedKey);
        }
      });
    } else if (Array.isArray(features)) {
      list = features;
    } else if (typeof features === 'string') {
      list = [features];
    }

    return list;
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Plans...</div>;

  if (errorMsg) {
    return (
      <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-200">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold text-red-800 mb-2">Oops! Kuch galat ho gaya.</h2>
        <p className="text-red-600 font-medium max-w-md mx-auto">{errorMsg}</p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-xl font-bold">Try Again</button>
      </div>
    );
  }

  const isTrial = currentPlan?.plan_code === 'trial' || !currentPlan;
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* HEADER & CURRENT STATUS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Subscription & Plans</h1>
          <p className="text-sm text-gray-500">Manage your billing and upgrade your business</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl shadow-inner">🚀</div>
          <div>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Current Plan</p>
            <h3 className="text-lg font-black text-blue-900">
              {isTrial ? `Free Trial (${getTrialDaysLeft()} days left)` : plans.find(p => p.plan_code === currentPlan?.plan_code)?.plan_name || currentPlan?.plan_code}
            </h3>
          </div>
        </div>
      </div>

      {/* 👇 MANUAL PAYMENT INFO BANNER (Yahan UPI ID hai) */}
      <div className="bg-yellow-50 border-2 border-yellow-300 p-5 rounded-2xl mb-4 shadow-sm">
        <h3 className="font-bold text-yellow-900 text-lg mb-2 flex items-center gap-2">
          <span>💳</span> Manual Payment Details
        </h3>
        <p className="text-yellow-800 text-sm mb-3">
          Plan activate karne ke liye neeche di gayi UPI ID par payment karein. Payment ke baad apna <b>Business Code</b> Admin ko WhatsApp karein.
        </p>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="bg-white border border-yellow-300 px-4 py-3 rounded-xl w-full md:w-auto">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Pay to UPI ID:</p>
            <p className="font-mono text-xl font-black text-gray-800 select-all">9808651905@ybl</p>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText("9808651905@ybl");
              alert("UPI ID Copied!");
            }}
            className="bg-yellow-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-yellow-600 transition w-full md:w-auto"
          >
            Copy UPI ID
          </button>
        </div>
      </div>

      {/* PLANS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan) => {
          const isActive = currentPlan?.plan_code === plan.plan_code;
          const isPro = plan.plan_code === 'pro';
          const featuresList = getFeaturesList(plan.features);

          return (
            <div key={plan.id} className={`bg-white rounded-3xl p-6 border-2 transition-all relative flex flex-col ${isPro ? 'border-blue-600 shadow-xl scale-105 z-10' : 'border-gray-100 shadow-sm hover:border-blue-200'}`}>
              
              {isPro && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6 border-b border-gray-100 pb-6">
                <h3 className="text-lg font-bold text-gray-800">{plan.plan_name}</h3>
                <div className="mt-2 flex justify-center items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">₹{plan.price}</span>
                  <span className="text-sm text-gray-500 font-medium">/ {plan.duration_days} days</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {featuresList.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 font-bold mt-0.5">✓</span> {feature}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 font-bold mt-0.5">✓</span> Max {plan.max_workers} Worker(s)
                </li>
              </ul>

              <button 
                onClick={() => handleUpgrade(plan)}
                disabled={isActive || upgrading}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  isActive 
                    ? 'bg-green-50 text-green-700 border border-green-200 cursor-default' 
                    : isPro 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {isActive ? 'Current Plan' : upgrading ? 'Processing...' : 'Activate Plan (Demo)'}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}