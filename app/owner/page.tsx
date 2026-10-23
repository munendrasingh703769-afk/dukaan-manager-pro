'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Business = {
  id: string; business_name: string;
  business_type: string; owner_name: string;
  city: string | null; trial_start_date: string | null;
  phone: string | null;
};

export default function OwnerDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [totalUdhaar, setTotalUdhaar] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [modalType, setModalType] = useState<string | null>(null);
  const [isBizDropdownOpen, setIsBizDropdownOpen] = useState(false);

  const [trialDays, setTrialDays] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData(overrideBizId?: string) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('users').select('*, businesses(*)').eq('id', user.id).single();
      
      if (profile) {
        let bizList: Business[] = [];
        if (profile.businesses) {
          bizList = Array.isArray(profile.businesses) ? profile.businesses : [profile.businesses];
        }
        
        setAllBusinesses(bizList);
        
        if (bizList.length > 0) {
          const storedBizId = typeof window !== 'undefined' ? localStorage.getItem('selectedBusinessId') : null;
          let activeBiz = bizList[0]; 

          if (overrideBizId) {
            activeBiz = bizList.find((b: any) => b.id === overrideBizId) || bizList[0];
          } else if (storedBizId) {
            activeBiz = bizList.find((b: any) => b.id === storedBizId) || bizList[0];
          }

          if (typeof window !== 'undefined') localStorage.setItem('selectedBusinessId', activeBiz.id);
          setCurrentBusiness(activeBiz);
          
          // TRIAL LOGIC: 15 Days exactly, dynamically calculated from current date
          if (activeBiz.trial_start_date) {
            const start = new Date(activeBiz.trial_start_date).getTime();
            const now = new Date().getTime();
            const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
            const daysLeft = 15 - daysPassed;
            setTrialDays(daysLeft > 0 ? daysLeft : 0);
          } else {
            setTrialDays(0);
          }

          const [custRes, prodRes] = await Promise.all([
            supabase.from('customers').select('id, name, current_balance, phone').eq('business_id', activeBiz.id),
            supabase.from('products').select('*').eq('business_id', activeBiz.id)
          ]);

          const customers = custRes.data || [];
          const products = prodRes.data || [];

          setTotalUdhaar(customers.reduce((sum, c) => sum + (c.current_balance || 0), 0));
          const lowStock = products.filter(p => p.stock_qty <= (p.low_stock_limit || 5));
          setLowStockCount(lowStock.length);
          setLowStockItems(lowStock);

          const { data: sales } = await supabase.from('sales').select('id, total_amount, created_at').eq('business_id', activeBiz.id).order('created_at', { ascending: false });
          
          let salesAmt = 0;
          let profitAmt = 0;
          if (sales) {
            const today = new Date().toISOString().split('T')[0];
            sales.forEach(s => {
              if (s.created_at.startsWith(today)) salesAmt += Number(s.total_amount || 0);
              profitAmt += Number(s.total_amount || 0); 
            });
          }
          setTodaySales(salesAmt);
          setTotalProfit(profitAmt);

          const { data: reqs } = await supabase.from('payment_requests').select('*, customers(name)').eq('business_id', activeBiz.id).eq('status', 'pending').order('created_at', { ascending: false });
          setPaymentRequests(reqs || []);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleBusinessSwitch(id: string) {
    setIsBizDropdownOpen(false);
    fetchData(id);
  }

  async function handleDeleteBusiness() {
    if (!currentBusiness) return;
    if (window.confirm(`Are you sure you want to delete ${currentBusiness.business_name}?`)) {
      try {
        const { error } = await supabase.from('businesses').delete().eq('id', currentBusiness.id);
        if (error) throw error;
        localStorage.removeItem('selectedBusinessId');
        alert("Business deleted successfully.");
        window.location.reload();
      } catch (err: any) {
        alert("Error deleting business: " + err.message);
      }
    }
  }

  async function handleRequestAction(req: any, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase.from('payment_requests').update({ status }).eq('id', req.id);
      if (error) throw error;
      if (status === 'approved') {
        const customer = await supabase.from('customers').select('current_balance').eq('id', req.customer_id).single();
        if (customer.data) {
          await supabase.from('customers').update({ current_balance: (customer.data.current_balance || 0) - req.amount }).eq('id', req.customer_id);
        }
      }
      fetchData(); 
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Dynamic Current Date
  const todayDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-3 sticky top-0 z-40 border-b border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">V</div>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight tracking-tight">VyapaarSetu</h1>
            <p className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase">Owner Panel</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative">
          {/* Business Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsBizDropdownOpen(!isBizDropdownOpen)}
              className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 max-w-[110px] active:scale-95 transition"
            >
              <span className="truncate">{currentBusiness?.business_name || 'Dukaan...'}</span>
              <span className="text-[8px]">▼</span>
            </button>
            
            {isBizDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="max-h-40 overflow-y-auto">
                  {allBusinesses.map(b => (
                    <button 
                      key={b.id} 
                      onClick={() => handleBusinessSwitch(b.id)}
                      className={`w-full text-left px-3 py-2 text-xs font-medium border-b border-slate-50 hover:bg-slate-50 ${currentBusiness?.id === b.id ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`}
                    >
                      {b.business_name}
                    </button>
                  ))}
                </div>
                <div className="p-2 bg-slate-50 border-t border-slate-200 flex flex-col gap-1">
                  <button onClick={() => router.push('/settings/business/new')} className="text-left px-2 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-white rounded transition-colors flex items-center gap-1">
                    <span className="text-sm">+</span> Add New Business
                  </button>
                  <button onClick={() => router.push('/settings/business')} className="text-left px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded transition-colors">✏️ Edit Business</button>
                  <button onClick={handleDeleteBusiness} className="text-left px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-white rounded transition-colors">🗑️ Delete Business</button>
                </div>
              </div>
            )}
          </div>
          
          {/* Notification Bell */}
          <button onClick={() => setModalType('notifications')} className="relative text-lg active:scale-90 transition-transform">
            🔔
            <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
          </button>
          
          {/* Profile */}
          <button onClick={() => setModalType('profile')} className="w-9 h-9 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm shadow-sm active:scale-90 transition-transform">
            👤
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-6 max-w-md mx-auto">
        
        {/* Business Info Card */}
        {currentBusiness && (
          <div className="relative overflow-hidden border border-slate-200 shadow-sm bg-white p-4 rounded-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-emerald-100">
                  {currentBusiness.business_type === 'shop' ? '🏪' : currentBusiness.business_type === 'service' ? '🔧' : '💼'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 line-clamp-1">{currentBusiness.business_name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Owner: {currentBusiness.owner_name}</p>
                  {currentBusiness.phone && (
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><span>📞</span> {currentBusiness.phone}</p>
                  )}
                  {currentBusiness.city && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><span>📍</span> {currentBusiness.city}</p>
                  )}
                </div>
              </div>
              <button onClick={() => router.push('/settings/business')} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 active:scale-95 transition-all">✏️ Edit</button>
            </div>
          </div>
        )}

        {/* Premium Trial Banner */}
        {currentBusiness && trialDays > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm relative overflow-hidden flex items-center justify-between">
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-xl">👑</div>
              <div>
                <h3 className="text-sm font-bold text-emerald-800 tracking-wide">Trial: {trialDays} days left</h3>
                <p className="text-[11px] text-emerald-600 font-medium">Explore premium features</p>
              </div>
            </div>
            <Link href="/pricing" className="relative z-10 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 active:scale-95 transition-all">Upgrade →</Link>
          </div>
        )}
        {/* Business Overview (Clickable Cards) */}
        <div className="flex items-center justify-between mt-6 mb-3 px-1">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Business Overview</h2>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
            <span className="text-[10px]">📅</span>
            <span className="text-[11px] font-semibold text-slate-600">{todayDate}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Today's Sales */}
          <div onClick={() => setModalType('todaySales')} className="cursor-pointer active:scale-95 transition-transform !bg-[#1e1e24] border-0 text-white shadow-md relative overflow-hidden rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">Today's Sales</p>
              <span className="text-sm bg-white/10 p-1.5 rounded-lg">📈</span>
            </div>
            <p className="text-2xl font-black relative z-10 tracking-tight">₹{(todaySales || 0).toLocaleString('en-IN')}</p>
          </div>

          {/* Total Udhaar */}
          <div onClick={() => setModalType('udhaar')} className="cursor-pointer active:scale-95 transition-transform border border-slate-200 shadow-sm relative overflow-hidden bg-white rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Total Udhaar</p>
              <span className="text-sm bg-rose-50 text-rose-500 p-1.5 rounded-lg">👥</span>
            </div>
            <p className="text-2xl font-black text-rose-500 tracking-tight">₹{(totalUdhaar || 0).toLocaleString('en-IN')}</p>
          </div>

          {/* Low Stock */}
          <div onClick={() => setModalType('lowStock')} className="cursor-pointer active:scale-95 transition-transform border border-slate-200 shadow-sm relative overflow-hidden bg-white rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Low Stock</p>
              <span className="text-sm bg-amber-50 text-amber-500 p-1.5 rounded-lg">⚠️</span>
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
              {lowStockCount || 0} <span className="text-xs font-medium text-slate-400">Items</span>
            </p>
          </div>

          {/* Net Profit */}
          <div onClick={() => setModalType('sales')} className="cursor-pointer active:scale-95 transition-transform bg-gradient-to-br from-indigo-600 to-violet-600 border-0 text-white shadow-md relative overflow-hidden rounded-2xl p-4">
             <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[11px] font-semibold tracking-wider text-indigo-100 uppercase">Net Profit</p>
              <button className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-semibold backdrop-blur-sm">View</button>
            </div>
            <p className="text-2xl font-black relative z-10 tracking-tight">₹{(totalProfit || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <div onClick={() => router.push('/sales/new')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 transition-all active:scale-95 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-sm">🛒</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">New Sale</p>
                </div>
              </div>
            </div>

            <div onClick={() => router.push('/products')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-blue-200 transition-all active:scale-95 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-sm">📦</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Product & Stock</p>
                </div>
              </div>
            </div>

            <div onClick={() => router.push('/purchases/new')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-emerald-200 transition-all active:scale-95 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-sm">🛍️</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Add Product</p>
                </div>
              </div>
            </div>

            <div onClick={() => router.push('/customers')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-violet-200 transition-all active:scale-95 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-lg shadow-sm">👤</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Add Customer</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business Modules */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Business Modules</h2>
          <div className="grid grid-cols-2 gap-3">
            <div onClick={() => router.push('/purchases')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-sm shadow-sm">🛍️</div>
                <p className="text-xs font-bold text-slate-800">Purchases</p>
            </div>
            <div onClick={() => router.push('/customers')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shadow-sm">👥</div>
                <p className="text-xs font-bold text-slate-800">Customers</p>
            </div>
            <div onClick={() => router.push('/suppliers')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-sm shadow-sm">🚚</div>
                <p className="text-xs font-bold text-slate-800">Suppliers</p>
            </div>
            <div onClick={() => router.push('/payments')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center text-sm shadow-sm">💰</div>
                <p className="text-xs font-bold text-slate-800">Udhaar & Pay</p>
            </div>
            <div onClick={() => router.push('/expenses')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-sm shadow-sm">💵</div>
                <p className="text-xs font-bold text-slate-800">Expenses</p>
            </div>
            <div onClick={() => router.push('/reports')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-sm shadow-sm">📊</div>
                <p className="text-xs font-bold text-slate-800">Reports & GST</p>
            </div>
            <div onClick={() => router.push('/settings/staff')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2 col-span-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm shadow-sm">🛡️</div>
                <p className="text-xs font-bold text-slate-800">Staff & Perms</p>
            </div>
          </div>
        </section>

        {/* More Features */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">More Features</h2>
          <div className="grid grid-cols-3 gap-2">
            <div onClick={() => router.push('/reports')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg shadow-sm">📈</div>
                <p className="text-[10px] font-bold text-slate-800 leading-tight">Reports<br/>Analysis</p>
            </div>
            <div onClick={() => router.push('/storefront')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg shadow-sm">🌐</div>
                <p className="text-[10px] font-bold text-slate-800 leading-tight">E-<br/>commerce</p>
            </div>
            <div onClick={() => router.push('/owner/quotations')} className="cursor-pointer bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg shadow-sm">📝</div>
                <p className="text-[10px] font-bold text-slate-800 leading-tight">Quotation</p>
            </div>
          </div>
        </section>

      </div>

      {/* Modals (Popups) */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setModalType(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-elevated animate-scale-in" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {modalType === 'profile' ? 'My Profile' : 
                 modalType === 'scanner' ? 'Scanner' : 
                 modalType === 'lowStock' ? 'Low Stock Alerts' : 
                 modalType === 'notifications' ? 'Notifications' :
                 modalType === 'todaySales' ? "Today's Sales" :
                 modalType === 'udhaar' ? 'Total Udhaar' : 'Sales'}
              </h3>
              <button onClick={() => setModalType(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
            </div>

            {/* Notification Modal */}
            {modalType === 'notifications' && (
              <div className="text-center py-6">
                <span className="text-4xl mb-3 block">🔔</span>
                <p className="text-sm text-slate-500">No new notifications right now.</p>
              </div>
            )}

            {/* Today's Sales Modal */}
            {modalType === 'todaySales' && (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500 mb-2">Total revenue generated today</p>
                <p className="text-4xl font-black text-slate-800">₹{(todaySales || 0).toLocaleString('en-IN')}</p>
                <button onClick={() => router.push('/sales')} className="w-full mt-6 border border-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl hover:bg-slate-50 transition">View All Sales</button>
              </div>
            )}

            {/* Udhaar Modal */}
            {modalType === 'udhaar' && (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500 mb-2">Total pending amount from customers</p>
                <p className="text-4xl font-black text-rose-500">₹{(totalUdhaar || 0).toLocaleString('en-IN')}</p>
                <button onClick={() => router.push('/customers')} className="w-full mt-6 border border-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl hover:bg-slate-50 transition">View Customers</button>
              </div>
            )}

            {/* Low Stock Modal */}
            {modalType === 'lowStock' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {lowStockItems.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No items low on stock.</p>
                ) : (
                  lowStockItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 text-sm">📦</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-500">Limit: {item.low_stock_limit || 5}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-rose-500">{item.stock_qty}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Left</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Profile Modal (Photo Upload + Edit) */}
            {modalType === 'profile' && (
              <div className="flex flex-col items-center py-4">
                <div className="relative w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-3xl mb-3 border border-indigo-100 shadow-sm overflow-hidden">
                  👤
                </div>
                <label className="bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md hover:bg-slate-800 active:scale-95 transition-all mb-5 inline-block">
                  Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={() => alert("Photo upload coming soon!")} />
                </label>
                <p className="text-base font-bold text-slate-800">{currentBusiness?.owner_name || 'Owner'}</p>
                <p className="text-xs text-slate-500 mb-5">{currentBusiness?.phone || 'Phone'}</p>
                <button onClick={() => { setModalType(null); router.push('/settings/business'); }} className="w-full border border-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl hover:bg-slate-50 transition">Edit Business Details</button>
              </div>
            )}

            {/* Scanner Modal */}
            {modalType === 'scanner' && (
              <div className="flex flex-col gap-3">
                <button onClick={() => { alert('Camera open...'); setModalType(null); }} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition text-left">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">📸</div>
                  <div><p className="text-sm font-bold text-slate-800">Bill Photo Scan</p><p className="text-[10px] text-slate-500">Auto-create Purchase entry</p></div>
                </button>
                <button onClick={() => { alert('Scanner open...'); setModalType(null); }} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition text-left">
                  <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xl">🔍</div>
                  <div><p className="text-sm font-bold text-slate-800">Scan QR Code</p><p className="text-[10px] text-slate-500">Scan product or customer QR</p></div>
                </button>
                <button onClick={() => { router.push('/purchases/new'); setModalType(null); }} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition text-left">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl">📝</div>
                  <div><p className="text-sm font-bold text-slate-800">Manual Entry</p><p className="text-[10px] text-slate-500">Enter details manually</p></div>
                </button>
              </div>
            )}

            {/* Sales Breakdown Modal */}
            {modalType === 'sales' && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-4">Detailed breakdown coming soon.</p>
                <button onClick={() => setModalType(null)} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition">Close</button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center pt-2 pb-6 px-1 z-30 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
        <Link href="/owner" className="flex flex-col items-center gap-1 text-indigo-600">
          <div className="w-12 h-8 bg-indigo-50 rounded-full flex items-center justify-center"><span className="text-lg">🏠</span></div>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
          <span className="text-lg">🛒</span>
          <span className="text-[10px] font-semibold">Orders</span>
        </Link>
        <button onClick={() => setModalType('scanner')} className="flex flex-col items-center justify-center bg-slate-900 text-white w-14 h-14 rounded-full -mt-6 shadow-lg border-4 border-white active:scale-95 transition-transform">
          <span className="text-xl">📸</span>
        </button>
        <Link href="/sales" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
          <span className="text-lg">📄</span>
          <span className="text-[10px] font-semibold">Sales</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-semibold">Settings</span>
        </Link>
      </nav>
    </main>
  );
}