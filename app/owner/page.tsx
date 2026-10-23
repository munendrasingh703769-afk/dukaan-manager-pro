'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient'; // (Agar error aaye to createClient use karein)

type Business = {
  id: string; business_name: string;
  business_type: string; owner_name: string;
  city: string | null; trial_start_date: string | null;
  phone: string | null;
};

type Customer = {
  id: string; name: string;
  current_balance: number;
  phone: string | null;
};

export default function OwnerDashboard() {
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

  const [trialDays, setTrialDays] = useState(0);
  const [userRole, setUserRole] = useState<string>('owner');
  const [viewMode, setViewMode] = useState<'today' | 'month' | 'all'>('today');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('users').select('*, businesses(*)').eq('id', user.id).single();
      
      if (profile) {
        setUserRole(profile.role);
        const bizList = Array.isArray(profile.businesses) ? profile.businesses : [profile.businesses];
        setAllBusinesses(bizList);
        
        const storedBizId = localStorage.getItem('selectedBusinessId');
        let activeBiz = bizList.find((b: any) => b.id === storedBizId);
        
        if (!activeBiz && bizList.length > 0) {
          activeBiz = bizList[0];
          localStorage.setItem('selectedBusinessId', bizList[0].id);
        }

        if (activeBiz) {
          setCurrentBusiness(activeBiz);
          
          if (activeBiz.trial_start_date) {
            const start = new Date(activeBiz.trial_start_date).getTime();
            const now = new Date().getTime();
            const diff = 14 - Math.floor((now - start) / (1000 * 60 * 60 * 24));
            setTrialDays(diff > 0 ? diff : 0);
          }

          const [custRes, prodRes] = await Promise.all([
            supabase.from('customers').select('*').eq('business_id', activeBiz.id),
            supabase.from('products').select('*').eq('business_id', activeBiz.id)
          ]);

          const customers = custRes.data || [];
          const products = prodRes.data || [];

          setTotalUdhaar(customers.reduce((sum, c) => sum + (c.current_balance || 0), 0));
          const lowStock = products.filter(p => p.stock_qty <= (p.low_stock_limit || 5));
          setLowStockCount(lowStock.length);
          setLowStockItems(lowStock);

          const { data: sales } = await supabase.from('sales').select('*').eq('business_id', activeBiz.id).order('created_at', { ascending: false });
          
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

  function handleBusinessSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    localStorage.setItem('selectedBusinessId', newId);
    const biz = allBusinesses.find(b => b.id === newId);
    if (biz) setCurrentBusiness(biz);
    fetchData();
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
        <div className="flex items-center gap-2">
          {allBusinesses.length > 0 && (
            <select 
              value={currentBusiness?.id || ''} 
              onChange={handleBusinessSwitch}
              className="text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 outline-none max-w-[110px] truncate"
            >
              {allBusinesses.map(b => (
                <option key={b.id} value={b.id}>{b.business_name}</option>
              ))}
            </select>
          )}
          <button className="relative text-lg">🔔<span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border border-white"></span></button>
          <button onClick={() => setModalType('profile')} className="w-9 h-9 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm shadow-sm">👤</button>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-6 max-w-md mx-auto">
        
        {/* Business Info Card */}
        {currentBusiness && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-4 items-center relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full pointer-events-none"></div>
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl shrink-0 border border-emerald-100">
              {currentBusiness.business_type === 'shop' ? '🏪' : currentBusiness.business_type === 'service' ? '🔧' : '💼'}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{currentBusiness.business_name}</h2>
              <p className="text-xs text-slate-500">{currentBusiness.owner_name}</p>
              {currentBusiness.city && (
                <p className="text-[10px] text-slate-400 mt-0.5">📍 {currentBusiness.city}</p>
              )}
            </div>
            <div className="ml-auto">
              <button onClick={() => router.push('/settings/business')} className="px-3 py-1.5 bg-slate-50 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100">Edit</button>
            </div>
          </div>
        )}

        {/* Premium Trial */}
        {trialDays > 0 && (
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">✨</span>
                <h3 className="text-xs font-black text-white tracking-wide">Premium Trial</h3>
              </div>
              <p className="text-[10px] text-orange-100 font-medium">{trialDays} days remaining</p>
            </div>
            <Link href="/pricing" className="bg-white text-orange-600 text-[10px] font-black px-4 py-2 rounded-xl shadow-sm active:scale-95 transition relative z-10">Upgrade</Link>
          </div>
        )}

        {/* Business Overview */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-black text-slate-800 tracking-tight">Business Overview</h2>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
              <span className="text-[10px]">📅</span>
              <span className="text-[10px] font-bold text-slate-600">{viewMode}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1e1e24] rounded-2xl p-4 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</p>
                <span className="text-[10px] bg-white/10 p-1 rounded">📈</span>
              </div>
              <p className="text-xl font-black text-white">₹{todaySales.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Udhaar</p>
                <span className="text-[10px] bg-rose-50 text-rose-500 p-1 rounded">👥</span>
              </div>
              <p className="text-xl font-black text-rose-500">₹{totalUdhaar.toLocaleString('en-IN')}</p>
            </div>

            <div onClick={() => setModalType('lowStock')} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low Stock</p>
                <span className="text-[10px] bg-amber-50 text-amber-500 p-1 rounded">⚠️</span>
              </div>
              <p className="text-xl font-black text-slate-800">{lowStockCount} <span className="text-[10px] text-slate-400 font-medium">Items</span></p>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-4 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Net Profit</p>
                <button onClick={() => setModalType('sales')} className="text-[9px] bg-white/20 text-white font-bold px-2 py-0.5 rounded shadow-sm">View</button>
              </div>
              <p className="text-xl font-black text-white">₹{totalProfit.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </section>
        {/* Payment Requests */}
        {paymentRequests.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Payment Requests</h2>
            <div className="space-y-3">
              {paymentRequests.map((req) => (
                <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{req.customers?.name || 'Customer'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Pending Approval</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{req.amount}</p>
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => handleRequestAction(req, 'rejected')} className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded">Reject</button>
                      <button onClick={() => handleRequestAction(req, 'approved')} className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm">Approve</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <div onClick={() => router.push('/sales/new')} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-95 transition cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm">🛒</div>
              <div>
                <p className="text-xs font-bold text-slate-800">New Sale</p>
                <p className="text-[9px] text-slate-500">Create invoice</p>
              </div>
            </div>

            <div onClick={() => router.push('/products')} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-95 transition cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm">📦</div>
              <div>
                <p className="text-xs font-bold text-slate-800">Product & Stock</p>
                <p className="text-[9px] text-slate-500">Add inventory</p>
              </div>
            </div>

            <div onClick={() => router.push('/purchases/new')} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-95 transition cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">📦</div>
              <div>
                <p className="text-xs font-bold text-slate-800">Add Product</p>
                <p className="text-[9px] text-slate-500">New item</p>
              </div>
            </div>

            <div onClick={() => router.push('/customers')} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-95 transition cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-sm">👤</div>
              <div>
                <p className="text-xs font-bold text-slate-800">Add Customer</p>
                <p className="text-[9px] text-slate-500">Register</p>
              </div>
            </div>

            <div onClick={() => router.push('/owner/quotations')} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-95 transition cursor-pointer col-span-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-sm">📝</div>
              <div>
                <p className="text-xs font-bold text-slate-800">Quotations</p>
                <p className="text-[9px] text-slate-500">Estimates for customer</p>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalType(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {modalType === 'profile' ? 'My Profile' : modalType === 'scanner' ? 'Scanner' : modalType === 'lowStock' ? 'Low Stock Alerts' : 'Sales'}
              </h3>
              <button onClick={() => setModalType(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">✕</button>
            </div>

            {modalType === 'lowStock' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {lowStockItems.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6 font-medium">No items low on stock.</p>
                ) : (
                  lowStockItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 text-sm">📦</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Alert limit: {item.low_stock_limit || 5}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-rose-600">{item.stock_qty}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest">Left</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {modalType === 'profile' && (
              <div className="flex flex-col items-center py-4">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-4 border border-slate-200">👤</div>
                <label className="bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md mb-5 hover:bg-slate-800 transition">
                  Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={() => alert("Photo upload coming soon!")} />
                </label>
                <p className="text-base font-bold text-slate-800">{currentBusiness?.owner_name || 'Owner'}</p>
                <p className="text-xs text-slate-500 font-medium mb-5">{currentBusiness?.phone || 'Phone'}</p>
                <button onClick={() => router.push('/settings/business')} className="w-full border border-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl hover:bg-slate-50 transition">Edit Business Details</button>
              </div>
            )}

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

            {modalType === 'sales' && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 mb-6 font-medium">Detailed breakdown coming soon.</p>
                <button onClick={() => setModalType(null)} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center pt-2 pb-6 px-1 z-30 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
        <Link href="/owner" className="flex flex-col items-center gap-1 text-slate-900">
          <div className="w-12 h-8 bg-slate-100 rounded-full flex items-center justify-center"><span className="text-lg">🏠</span></div>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition">
          <span className="text-lg">🛒</span>
          <span className="text-[10px] font-bold">Orders</span>
        </Link>
        <button onClick={() => setModalType('scanner')} className="flex flex-col items-center justify-center bg-slate-900 text-white w-14 h-14 rounded-full -mt-6 shadow-md border-4 border-white active:scale-95 transition">
          <span className="text-xl">📸</span>
        </button>
        <Link href="/sales" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition">
          <span className="text-lg">📄</span>
          <span className="text-[10px] font-bold">Sales</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition">
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-bold">Settings</span>
        </Link>
      </nav>
    </main>
  );
}