'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ADMIN_PASSWORD = 'Munnendra@2026'

type Plan = {
  id: string;
  plan_name: string;
  plan_code: string;
  price: number;
  duration_days: number;
}

type Row = {
  id: string;
  business_id: string;
  business_code: string;
  business_name: string;
  plan_code: string;
  status: string;
  amount: number;
  current_period_end: string;
  updated_at: string;
}

export default function AdminPage() {
  const supabase = createClient();

  // Auth
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Data
  const [plans, setPlans] = useState<Plan[]>([]);
  const [recent, setRecent] = useState<Row[]>([]);
  
  // Manual Form
  const [businessCode, setBusinessCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      loadPlans();
      loadRecent();
    }
  }, [isLoggedIn]);

  async function loadPlans() {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
      
    if (data) {
      setPlans(data as any);
      if (data.length > 0) setSelectedPlan(data[0].plan_code);
    }
  }

  async function loadRecent() {
    // Fetch subscriptions
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
      return;
    }

    if (subs) {
      // Manually map business details to avoid join errors
      const list: Row[] = await Promise.all(
        subs.map(async (s) => {
          const { data: biz } = await supabase
            .from('businesses')
            .select('name, business_code')
            .eq('id', s.business_id)
            .single();

          return {
            id: s.id,
            business_id: s.business_id,
            business_code: biz?.business_code || 'N/A',
            business_name: biz?.name || 'Unknown Business',
            plan_code: s.plan_code,
            status: s.status,
            amount: s.amount_paid || 0,
            current_period_end: s.current_period_end,
            updated_at: s.updated_at,
          };
        })
      );
      setRecent(list);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setErr('');
    } else {
      setErr('Invalid Password!');
    }
  }

  // 1. Manual Activation via Business Code
  async function activatePlan() {
    setSaving(true);
    setErr('');
    setSaved(false);

    if (!businessCode.trim() || !selectedPlan) {
      setErr('Business code and plan are required');
      setSaving(false);
      return;
    }

    const plan = plans.find(p => p.plan_code === selectedPlan);
    if (!plan) return;

    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('id')
      .eq('business_code', businessCode.trim())
      .single();

    if (bizErr || !biz) {
      setErr('Business not found! Please check the code.');
      setSaving(false);
      return;
    }

    const now = new Date();
    const end = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

    const { error: upErr } = await supabase.from('subscriptions').upsert({
      business_id: biz.id,
      plan_code: plan.plan_code,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      amount_paid: plan.price,
      payment_method: 'manual',
      updated_at: now.toISOString(),
    }, { onConflict: 'business_id' });

    if (upErr) {
      setErr(upErr.message);
    } else {
      setSaved(true);
      setBusinessCode('');
      loadRecent();
    }
    setSaving(false);
  }

  // 2. Approve Direct Request (From Provider App)
  const handleApproveDirect = async (subId: string) => {
    if (!confirm("Approve this payment and activate the plan?")) return;
    
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', subId);

    if (!error) {
      alert("✅ Plan Activated Successfully!");
      loadRecent(); // Refresh list
    } else {
      alert("Error: " + error.message);
    }
  };

  const totalRevenue = recent.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const activeSubs = recent.filter(s => s.status === 'active').length;
  const pendingSubs = recent.filter(s => s.status === 'pending').length;

  // ================= LOGIN SCREEN =================
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#0B192C] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🛡️</div>
            <h1 className="text-2xl font-black text-gray-800">Admin Access</h1>
            <p className="text-sm text-gray-500 mt-1">VyapaarSetu Master Control</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                placeholder="Enter Admin Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest"
              />
            </div>
            {err && <p className="text-red-500 text-xs font-bold text-center">{err}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">
              Login to Dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }
  // ================= MAIN DASHBOARD =================
  return (
    <main className="min-h-screen bg-[#F8F9FB] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-[#0B192C] text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-wide">Admin Master Panel</h1>
            <p className="text-gray-400 text-sm mt-1">Manage subscriptions and platform revenue</p>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-500/30 transition">
            Logout
          </button>
        </div>

        {/* SUMMARY STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl mb-3">📊</div>
            <p className="text-sm text-gray-500 font-bold mb-1">Total Subs</p>
            <h2 className="text-2xl font-black text-gray-800">{recent.length}</h2>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl mb-3">✅</div>
            <p className="text-sm text-gray-500 font-bold mb-1">Active Plans</p>
            <h2 className="text-2xl font-black text-green-600">{activeSubs}</h2>
          </div>
          <div className="bg-orange-50 p-5 rounded-2xl shadow-sm border border-orange-200">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-xl mb-3">⏳</div>
            <p className="text-sm text-orange-800 font-bold mb-1">Pending Requests</p>
            <h2 className="text-2xl font-black text-orange-600">{pendingSubs}</h2>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-700 p-5 rounded-2xl shadow-md text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl mb-3">💰</div>
            <p className="text-sm text-green-100 font-bold mb-1">Total Revenue</p>
            <h2 className="text-2xl font-black">₹{totalRevenue}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* MANUAL ACTIVATION FORM */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Manual Activate (Offline)</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Business Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. VYAP-1234" 
                  value={businessCode}
                  onChange={e => setBusinessCode(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Select Plan</label>
                <select 
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select a plan</option>
                  {plans.map(p => (
                    <option key={p.plan_code} value={p.plan_code}>
                      {p.plan_name} - ₹{p.price} ({p.duration_days} days)
                    </option>
                  ))}
                </select>
              </div>

              {err && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center border border-red-100">{err}</div>}
              {saved && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm font-bold text-center border border-green-100">Plan activated successfully! ✅</div>}

              <button 
                onClick={activatePlan} 
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50 mt-2 flex justify-center items-center gap-2"
              >
                {saving ? 'Activating...' : 'Activate Plan'}
              </button>
            </div>
          </div>

          {/* RECENT SUBSCRIPTIONS & PENDING LIST */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Recent Transactions</h2>
            
            {recent.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No subscriptions found in database.</p>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {recent.map(r => (
                  <div key={r.id} className={`flex flex-col bg-gray-50 p-4 rounded-xl border ${r.status === 'pending' ? 'border-orange-300 bg-orange-50' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{r.business_name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{r.business_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-green-600">₹{r.amount}</p>
                        <p className={`text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded-full inline-block ${
                          r.status === 'active' ? 'bg-green-100 text-green-700' : 
                          r.status === 'pending' ? 'bg-orange-200 text-orange-800' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {r.plan_code} • {r.status}
                        </p>
                      </div>
                    </div>
                    
                    {/* 👇 APPROVE BUTTON FOR PENDING */}
                    {r.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button 
                          onClick={() => handleApproveDirect(r.id)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-xs shadow-sm hover:bg-green-700 transition"
                        >
                          ✅ Approve & Activate
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}