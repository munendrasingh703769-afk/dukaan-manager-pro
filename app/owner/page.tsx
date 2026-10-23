'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/Client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type Business = {
  id: string; business_name: string;
  business_type: string; owner_name: string;
  city: string | null; trial_start_date: string | null;
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

      const { data: profile } = await supabase
        .from('users').select('*, businesses(*)').eq('id', user.id).single();
      
      if (profile) setUserRole(profile.role);

      if (profile?.businesses && profile.businesses.length > 0) {
        const bizList = Array.isArray(profile.businesses) ? profile.businesses : [profile.businesses];
        const biz = bizList[0];
        setCurrentBusiness(biz);

        if (biz.trial_start_date) {
          const start = new Date(biz.trial_start_date).getTime();
          const now = new Date().getTime();
          const diff = 14 - Math.floor((now - start) / (1000 * 60 * 60 * 24));
          setTrialDays(diff > 0 ? diff : 0);
        }

        const [custRes, prodRes] = await Promise.all([
          supabase.from('customers').select('*').eq('business_id', biz.id),
          supabase.from('products').select('*').eq('business_id', biz.id)
        ]);

        const customers = custRes.data || [];
        setTotalUdhaar(customers.reduce((sum, c) => sum + (c.current_balance || 0), 0));
        setLowStockItems((prodRes.data || []).filter(p => p.stock_qty <= (p.low_stock_limit || 5)));
        setLowStockCount((prodRes.data || []).filter(p => p.stock_qty <= (p.low_stock_limit || 5)).length);

        const { data: sales } = await supabase.from('sales').select('*').eq('business_id', biz.id).order('created_at', { ascending: false });
        if (sales) {
          let todaySalesAmt = 0;
          let profitAmt = 0;
          const today = new Date().toISOString().split('T')[0];
          
          sales.forEach(s => {
            if (s.created_at.startsWith(today)) todaySalesAmt += Number(s.total_amount || 0);
            profitAmt += Number(s.total_amount || 0);
          });
          setTodaySales(todaySalesAmt);
          setTotalProfit(profitAmt);
        }

        const { data: reqs } = await supabase.from('payment_requests').select('*, customers(name)').eq('business_id', biz.id).eq('status', 'pending').order('created_at', { ascending: false });
        setPaymentRequests(reqs || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    router.push(path);
  };

  async function handleRequestAction(req: any, action: 'approved' | 'rejected') {
    if (action === 'rejected') {
      await supabase.from('payment_requests').update({ status: 'rejected' }).eq('id', req.id);
      setPaymentRequests(paymentRequests.filter(r => r.id !== req.id));
      return;
    }

    const { data: cust } = await supabase.from('customers').select('current_balance').eq('id', req.customer_id).single();
    if (cust) {
      await supabase.from('customers').update({ current_balance: (cust.current_balance || 0) - req.amount }).eq('id', req.customer_id);
      await supabase.from('payment_requests').update({ status: 'approved' }).eq('id', req.id);
      setPaymentRequests(paymentRequests.filter(r => r.id !== req.id));
      fetchData();
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
          <button onClick={() => setModalType('profile')} className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-sm shadow-sm hover:bg-slate-100 transition-colors">
            👤
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-6 max-w-md mx-auto">
        
        {/* Business Info Card */}
        {currentBusiness && (
          <Card className="relative overflow-hidden border border-slate-200 shadow-sm bg-white p-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-indigo-100">
                  {currentBusiness.business_type === 'shop' ? '🏪' : currentBusiness.business_type === 'service' ? '🔧' : '💼'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 line-clamp-1">{currentBusiness.business_name || 'My Business'}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{currentBusiness.owner_name || 'Owner'}</p>
                  {currentBusiness.city && (
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><span>📍</span> {currentBusiness.city}</p>
                  )}
                </div>
              </div>
              <button onClick={() => router.push('/settings/business')} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100 active:scale-95 transition-all">Edit</button>
            </div>
          </Card>
        )}

        {/* Premium Trial Banner */}
        {trialDays > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 shadow-md relative overflow-hidden flex items-center justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-5 -mt-5"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">✨</span>
                <h3 className="text-sm font-bold text-white tracking-wide">Premium Trial</h3>
              </div>
              <p className="text-xs text-indigo-100 font-medium">{trialDays} days remaining</p>
            </div>
            <Link href="/pricing" className="relative z-10 bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all">Upgrade</Link>
          </div>
        )}

        {/* Business Overview */}
        <div className="flex items-center justify-between mt-6 mb-3 px-1">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Business Overview</h2>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
            <span className="text-[10px]">📅</span>
            <span className="text-[11px] font-semibold text-slate-600">Today</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Today's Sales */}
          <Card className="bg-gradient-to-br from-indigo-600 to-violet-600 border-0 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[11px] font-semibold tracking-wider text-indigo-100 uppercase">Today's Sales</p>
              <span className="text-sm bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">📈</span>
            </div>
            <p className="text-2xl font-black relative z-10 tracking-tight">₹{(todaySales || 0).toLocaleString('en-IN')}</p>
          </Card>

          {/* Total Udhaar */}
          <Card className="border border-slate-200 shadow-sm relative overflow-hidden bg-white">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Total Udhaar</p>
              <span className="text-sm bg-rose-50 text-rose-500 p-1.5 rounded-lg">👥</span>
            </div>
            <p className="text-2xl font-black text-rose-500 tracking-tight">₹{(totalUdhaar || 0).toLocaleString('en-IN')}</p>
          </Card>

          {/* Low Stock */}
          <Card onClick={() => setModalType('lowStock')} className="cursor-pointer hover:border-amber-200 transition-all border border-slate-200 shadow-sm relative overflow-hidden bg-white">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Low Stock</p>
              <span className="text-sm bg-amber-50 text-amber-500 p-1.5 rounded-lg">⚠️</span>
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
              {lowStockCount || 0} <span className="text-xs font-medium text-slate-400">Items</span>
            </p>
          </Card>

          {/* Net Profit */}
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white shadow-md relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[11px] font-semibold tracking-wider text-emerald-100 uppercase">Net Profit</p>
              <button onClick={() => setModalType('sales')} className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-semibold backdrop-blur-sm hover:bg-white/30 transition-colors">View</button>
            </div>
            <p className="text-2xl font-black relative z-10 tracking-tight">₹{(totalProfit || 0).toLocaleString('en-IN')}</p>
          </Card>
        </div>
        {/* Payment Requests Section */}
        {paymentRequests.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Payment Requests</h2>
            <div className="space-y-3">
              {paymentRequests.map((req) => (
                <Card key={req.id} className="border border-indigo-100 bg-indigo-50/30 p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{req.customers?.name || 'Customer'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Pending Approval</p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-indigo-100/50">
                    <p className="text-lg font-black text-slate-800">₹{req.amount}</p>
                    <div className="flex gap-2">
                      <Button variant="danger" size="sm" onClick={() => handleRequestAction(req, 'rejected')} className="px-3">Reject</Button>
                      <Button variant="primary" size="sm" onClick={() => handleRequestAction(req, 'approved')} className="px-3">Approve</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card onClick={() => router.push('/sales/new')} className="cursor-pointer hover:border-indigo-200 transition-all active:scale-95 p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-sm">🛒</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">New Sale</p>
                  <p className="text-[11px] text-slate-500">Create invoice</p>
                </div>
              </div>
            </Card>

            <Card onClick={() => router.push('/products')} className="cursor-pointer hover:border-blue-200 transition-all active:scale-95 p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-sm">📦</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Product & Stock</p>
                  <p className="text-[11px] text-slate-500">Add inventory</p>
                </div>
              </div>
            </Card>

            <Card onClick={() => router.push('/purchases/new')} className="cursor-pointer hover:border-emerald-200 transition-all active:scale-95 p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-sm">🛍️</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Add Product</p>
                  <p className="text-[11px] text-slate-500">New item</p>
                </div>
              </div>
            </Card>

            <Card onClick={() => router.push('/customers')} className="cursor-pointer hover:border-violet-200 transition-all active:scale-95 p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-lg shadow-sm">👤</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Add Customer</p>
                  <p className="text-[11px] text-slate-500">Register</p>
                </div>
              </div>
            </Card>

            <Card onClick={() => router.push('/owner/quotations')} className="cursor-pointer hover:border-amber-200 transition-all active:scale-95 p-3 col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shadow-sm">📝</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Quotations</p>
                  <p className="text-[11px] text-slate-500">Estimates for customer</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

      </div>

      {/* Modals (Popups) */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setModalType(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-elevated animate-scale-in" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {modalType === 'profile' ? 'My Profile' : modalType === 'scanner' ? 'Scanner' : modalType === 'lowStock' ? 'Low Stock Alerts' : 'Sales Details'}
              </h3>
              <button onClick={() => setModalType(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
            </div>

            {/* Low Stock Modal Content */}
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
                          <p className="text-[10px] text-slate-500">Alert limit: {item.low_stock_limit || 5}</p>
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

            {/* Profile Modal Content */}
            {modalType === 'profile' && (
              <div className="flex flex-col items-center py-4">
                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-3xl mb-3 border border-indigo-100 shadow-sm">👤</div>
                <p className="text-base font-bold text-slate-800">{currentBusiness?.owner_name || 'Owner'}</p>
                <p className="text-xs text-slate-500 mb-4">{currentBusiness?.phone || 'Phone'}</p>
                <Button variant="outline" fullWidth onClick={() => router.push('/settings/business')}>Edit Business Details</Button>
              </div>
            )}

            {/* Scanner Modal Content */}
            {modalType === 'scanner' && (
              <div className="flex flex-col gap-3">
                <Button variant="outline" fullWidth onClick={() => { alert('Camera open...'); setModalType(null); }}>📸 Bill Photo Scan</Button>
                <Button variant="outline" fullWidth onClick={() => { alert('Scanner open...'); setModalType(null); }}>🔍 Scan QR Code</Button>
                <Button variant="primary" fullWidth onClick={() => { router.push('/purchases/new'); setModalType(null); }}>📝 Manual Entry</Button>
              </div>
            )}

            {modalType === 'sales' && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-4">Detailed breakdown coming soon.</p>
                <Button variant="primary" fullWidth onClick={() => setModalType(null)}>Close</Button>
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