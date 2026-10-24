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
  const [modalType, setModalType] = useState<string | null>(null);
  const [isBizDropdownOpen, setIsBizDropdownOpen] = useState(false);

  const [trialDays, setTrialDays] = useState(15);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData(overrideBizId?: string) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Agar user login nahi hai toh direct login page pe bhejo
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
          
          // Trial Logic
          if (activeBiz.trial_start_date) {
            const start = new Date(activeBiz.trial_start_date).getTime();
            const now = new Date().getTime();
            const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
            const daysLeft = 15 - daysPassed;
            setTrialDays(daysLeft > 0 ? daysLeft : 0);
          } else {
            setTrialDays(0);
          }

          // Fetch Data
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
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Dropdown Switch Fix
  function handleBusinessSwitch(id: string) {
    setIsBizDropdownOpen(false);
    localStorage.setItem('selectedBusinessId', id);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
          {/* Business Dropdown with Edit/Delete */}
          <div className="relative">
            <button 
              onClick={() => setIsBizDropdownOpen(!isBizDropdownOpen)}
              className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 max-w-[110px] active:scale-95 transition"
            >
              <span className="truncate">{currentBusiness?.business_name || 'Dukaan...'}</span>
              <span className="text-[8px]">▼</span>
            </button>
            
            {isBizDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
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
        
                {/* Business Info Card (Owner Details) */}
        {currentBusiness && (
          <div className="relative overflow-hidden border border-slate-200 shadow-sm bg-white p-4 rounded-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-emerald-100">
                  {currentBusiness?.business_type === 'shop' ? '🏪' : currentBusiness?.business_type === 'service' ? '🔧' : '💼'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 line-clamp-1">{currentBusiness?.business_name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Owner: {currentBusiness?.owner_name}</p>
                  {currentBusiness?.phone && (
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><span>📞</span> {currentBusiness?.phone}</p>
                  )}
                  {currentBusiness?.city && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><span>📍</span> {currentBusiness?.city}</p>
                  )}
                </div>
              </div>
              <Link href="/settings/business" className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 active:scale-95 transition-all">✏️ Edit</Link>
            </div>
          </div>
        )}
                {/* Premium Trial Banner (Always Visible) */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-xl">👑</div>
            <div>
              <h3 className="text-sm font-bold text-emerald-800 tracking-wide">
                {trialDays > 0 ? `Trial: ${trialDays} days left` : 'Trial Expired'}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium">Upgrade to unlock all features</p>
            </div>
          </div>
          <Link href="/pricing" className="relative z-10 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all">
            Upgrade →
          </Link>
        </div>
        
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
          <Link href="/sales" className="active:scale-95 transition-transform !bg-[#1e1e24] border-0 text-white shadow-md relative overflow-hidden rounded-2xl p-4 block">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">Today's Sales</p>
              <span className="text-sm bg-white/10 p-1.5 rounded-lg">📈</span>
            </div>
            <p className="text-2xl font-black relative z-10 tracking-tight">₹{(todaySales || 0).toLocaleString('en-IN')}</p>
          </Link>

          {/* Total Udhaar */}
          <Link href="/customers" className="active:scale-95 transition-transform border border-slate-200 shadow-sm relative overflow-hidden bg-white rounded-2xl p-4 block">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Total Udhaar</p>
              <span className="text-sm bg-rose-50 text-rose-500 p-1.5 rounded-lg">👥</span>
            </div>
            <p className="text-2xl font-black text-rose-500 tracking-tight">₹{(totalUdhaar || 0).toLocaleString('en-IN')}</p>
          </Link>

          {/* Low Stock */}
          <Link href="/products" className="active:scale-95 transition-transform border border-slate-200 shadow-sm relative overflow-hidden bg-white rounded-2xl p-4 block">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Low Stock</p>
              <span className="text-sm bg-amber-50 text-amber-500 p-1.5 rounded-lg">⚠️</span>
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
              {lowStockCount || 0} <span className="text-xs font-medium text-slate-400">Items</span>
            </p>
          </Link>

          {/* Net Profit */}
          <Link href="/reports" className="active:scale-95 transition-transform bg-gradient-to-br from-indigo-600 to-violet-600 border-0 text-white shadow-md relative overflow-hidden rounded-2xl p-4 block">
             <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[11px] font-semibold tracking-wider text-indigo-100 uppercase">Net Profit</p>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-semibold backdrop-blur-sm">View</span>
            </div>
            <p className="text-2xl font-black relative z-10 tracking-tight">₹{(totalProfit || 0).toLocaleString('en-IN')}</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/sales/new" className="bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 transition-all active:scale-95 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-sm">🛒</div>
                <div><p className="text-sm font-bold text-slate-800">New Sale</p></div>
              </div>
            </Link>
            <Link href="/products" className="bg-white border border-slate-200 rounded-2xl hover:border-blue-200 transition-all active:scale-95 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-sm">📦</div>
                <div><p className="text-sm font-bold text-slate-800">Product & Stock</p></div>
              </div>
            </Link>
            <Link href="/products/new" className="bg-white border border-slate-200 rounded-2xl hover:border-emerald-200 transition-all active:scale-95 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-sm">🛍️</div>
                <div><p className="text-sm font-bold text-slate-800">Add Product</p></div>
              </div>
            </Link>
            <Link href="/customers/new" className="bg-white border border-slate-200 rounded-2xl hover:border-violet-200 transition-all active:scale-95 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-lg shadow-sm">👤</div>
                <div><p className="text-sm font-bold text-slate-800">Add Customer</p></div>
              </div>
            </Link>
          </div>
        </section>

        {/* Business Modules */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Business Modules</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/purchases" className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center text-sm shadow-sm">🛍️</div>
                <p className="text-xs font-bold text-slate-800">Purchases</p>
            </Link>
            <Link href="/customers" className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shadow-sm">👥</div>
                <p className="text-xs font-bold text-slate-800">Customers</p>
            </Link>
            <Link href="/suppliers" className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-sm shadow-sm">🚚</div>
                <p className="text-xs font-bold text-slate-800">Suppliers</p>
            </Link>
            <Link href="/payments" className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center text-sm shadow-sm">💰</div>
                <p className="text-xs font-bold text-slate-800">Udhaar & Pay</p>
            </Link>
            <Link href="/expenses" className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-sm shadow-sm">💵</div>
                <p className="text-xs font-bold text-slate-800">Expenses</p>
            </Link>
            <Link href="/reports" className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-sm shadow-sm">📊</div>
                <p className="text-xs font-bold text-slate-800">Reports & GST</p>
            </Link>
            <Link href="/settings/workers" className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex items-center gap-2 col-span-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm shadow-sm">🛡️</div>
                <p className="text-xs font-bold text-slate-800">Staff & Perms</p>
            </Link>
          </div>
        </section>

        {/* More Features */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">More Features</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/reports" className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg shadow-sm">📈</div>
                <p className="text-[10px] font-bold text-slate-800 leading-tight">Reports<br/>Analysis</p>
            </Link>
            <button onClick={() => alert('E-commerce feature coming soon!')} className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg shadow-sm">🌐</div>
                <p className="text-[10px] font-bold text-slate-800 leading-tight">E-<br/>commerce</p>
            </button>
            <button onClick={() => alert('Quotation feature coming soon!')} className="bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all active:scale-95 p-3 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg shadow-sm">📝</div>
                <p className="text-[10px] font-bold text-slate-800 leading-tight">Quotation</p>
            </button>
          </div>
        </section>
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalType(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {modalType === 'profile' ? 'My Profile' : modalType === 'scanner' ? 'Scanner' : 'Notifications'}
              </h3>
              <button onClick={() => setModalType(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">✕</button>
            </div>
            {modalType === 'notifications' && (
              <div className="text-center py-6"><span className="text-4xl mb-3 block">🔔</span><p className="text-sm text-slate-500">No new notifications right now.</p></div>
            )}
            {modalType === 'profile' && (
              <div className="flex flex-col items-center py-4">
                <div className="relative w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-3xl mb-3 border border-indigo-100 shadow-sm overflow-hidden">👤</div>
                <label className="bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md hover:bg-slate-800 mb-5 inline-block">Upload Photo<input type="file" accept="image/*" className="hidden" onChange={() => alert("Photo upload will be connected soon!")} /></label>
                <p className="text-base font-bold text-slate-800">{currentBusiness?.owner_name || 'Owner'}</p>
                <p className="text-xs text-slate-500 mb-5">{currentBusiness?.phone || 'Phone'}</p>
                <button onClick={() => { setModalType(null); router.push('/settings/business'); }} className="w-full border border-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl hover:bg-slate-50">Edit Business Details</button>
              </div>
            )}
            {modalType === 'scanner' && (
              <div className="flex flex-col gap-3">
                <button onClick={() => { alert('Camera open...'); setModalType(null); }} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 text-left"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">📸</div><div><p className="text-sm font-bold text-slate-800">Bill Photo Scan</p></div></button>
                <button onClick={() => { alert('Scanner open...'); setModalType(null); }} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 text-left"><div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xl">🔍</div><div><p className="text-sm font-bold text-slate-800">Scan QR Code</p></div></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center pt-2 pb-6 px-1 z-30 shadow-lg">
        <Link href="/owner" className="flex flex-col items-center gap-1 text-indigo-600"><div className="w-12 h-8 bg-indigo-50 rounded-full flex items-center justify-center"><span className="text-lg">🏠</span></div><span className="text-[10px] font-bold">Home</span></Link>
        <Link href="/orders" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"><span className="text-lg">🛒</span><span className="text-[10px] font-semibold">Orders</span></Link>
        <button onClick={() => setModalType('scanner')} className="flex flex-col items-center justify-center bg-slate-900 text-white w-14 h-14 rounded-full -mt-6 shadow-lg border-4 border-white active:scale-95 transition-transform"><span className="text-xl">📸</span></button>
        <Link href="/sales" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"><span className="text-lg">📄</span><span className="text-[10px] font-semibold">Sales</span></Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"><span className="text-lg">⚙️</span><span className="text-[10px] font-semibold">Settings</span></Link>
      </nav>
    </main>
  );
}