'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui /Card';
import Button from '@/components /ui/Button';
import Badge from '@/components/ui /Badge';
import { Building2, Crown, Bell, ScanLine, ArrowUpRight, AlertTriangle, TrendingUp, DollarSign, FileText, ChevronRight, UserPlus, ShoppingBag, PlusCircle, Trash2, Settings, Smartphone, LogOut, Check, X } from 'lucide-react';

type Business = {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  trial_start_date: string | null;
  status: string | null;
};

type Counts = {
  products: number;
  todaySales: number;
  totalUdhaar: number;
  monthProfit: number;
  totalCust: number;
};
export default function OwnerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [isBizDropOpen, setIsBizDropOpen] = useState(false);
  const [isStockNotifOn, setIsStockNotifOn] = useState(false);
  
  const [counts, setCounts] = useState<Counts>({
    products: 0,
    todaySales: 0,
    totalUdhaar: 0,
    monthProfit: 0,
    totalCust: 0
  });

  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [modalType, setModalType] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);
  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*, businesses(*)')
        .eq('id', user.id)
        .single();

      if (pErr) throw pErr;

      if (profile && profile.businesses) {
        const bList = Array.isArray(profile.businesses) ? profile.businesses : [profile.businesses];
        setAllBusinesses(bList);

        if (bList.length > 0) {
          const storedBizId = localStorage.getItem('selectedBusinessId');
          let activeBiz = bList.find((b) => b.id === storedBizId) || bList[0];
          setCurrentBusiness(activeBiz);
          localStorage.setItem('selectedBusinessId', activeBiz.id);

          if (activeBiz.trial_start_date) {
            const start = new Date(activeBiz.trial_start_date);
            const now = new Date();
            const diffTime = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const remaining = 30 - diffTime;
            setTrialDays(remaining > 0 ? remaining : 0);
          }
          await fetchBusinessStats(activeBiz.id);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBusinessStats(businessId: string) {
    const { data: products } = await supabase.from('products').select('*').eq('business_id', businessId);
    const { data: sales } = await supabase.from('sales').select('*').eq('business_id', businessId);
    const { data: customers } = await supabase.from('customers').select('*').eq('business_id', businessId);

    let tSales = 0, tProfit = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    sales?.forEach((s: any) => {
      const sDate = new Date(s.created_at).toISOString().split('T')[0];
      if (sDate === todayStr) {
        tSales += Number(s.total_amount || 0);
        tProfit += Number(s.profit_amount || 0);
      }
    });

    let tUdhaar = 0;
    customers?.forEach((c: any) => { tUdhaar += Number(c.total_udhaar || 0); });

    const lowStocks = products?.filter((p: any) => Number(p.current_balance || 0) <= Number(p.min_balance_limit || 0)) || [];
    setLowStockList(lowStocks);

    setCounts({
      products: products?.length || 0,
      todaySales: tSales,
      totalUdhaar: tUdhaar,
      monthProfit: tProfit,
      totalCust: customers?.length || 0
    });

    const { data: pReqs } = await supabase.from('payment_requests').select('*').eq('business_id', businessId).eq('status', 'pending');
    setPaymentRequests(pReqs || []);
  }
  function handleBusinessSwitch(biz: Business) {
    setCurrentBusiness(biz);
    localStorage.setItem('selectedBusinessId', biz.id);
    setIsBizDropOpen(false);
    fetchBusinessStats(biz.id);
  }

  async function handleDeleteBusiness() {
    if (!currentBusiness) return;
    if (!confirm(`क्या आप सचमुच "${currentBusiness.name}" को डिलीट करना चाहते हैं?`)) return;
    try {
      const { error } = await supabase.from('businesses').delete().eq('id', currentBusiness.id);
      if (error) throw error;
      alert('व्यवसाय सफलतापूर्वक हटा दिया गया!');
      localStorage.removeItem('selectedBusinessId');
      window.location.reload();
    } catch (err: any) {
      alert('त्रुटि: ' + err.message);
    }
  }

  async function handleRequestAction(reqId: string, action: 'approved' | 'rejected') {
    if (!confirm(`क्या आप इस पेमेंट को ${action === 'approved' ? 'स्वीकार' : 'अस्वीकार'} करना चाहते हैं?`)) return;
    try {
      const { error } = await supabase.from('payment_requests').update({ status: action }).eq('id', reqId);
      if (error) throw error;
      alert(`पेमेंट रिक्वेस्ट ${action === 'approved' ? 'Approved' : 'Rejected'} हो गई है।`);
      if (currentBusiness) fetchBusinessStats(currentBusiness.id);
    } catch (err: any) {
      alert('त्रुटि: ' + err.message);
    }
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 relative">
      
      {/* APP HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="relative">
          <button onClick={() => setIsBizDropOpen(!isBizDropOpen)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-900 transition">
            <Building2 size={16} className="text-indigo-600" />
            <span>{currentBusiness?.name || 'Select Business'}</span>
          </button>
          {isBizDropOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              {allBusinesses.map((b) => (
                <button key={b.id} onClick={() => handleBusinessSwitch(b)} className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 font-semibold ${currentBusiness?.id === b.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-700'}`}>
                  {b.name} {currentBusiness?.id === b.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setModalType('notifications')} className="p-2 text-slate-600 rounded-xl relative">
            <Bell size={20} />
            {paymentRequests.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />}
          </button>
          <button onClick={() => setModalType('profile')} className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-xl shadow-md"><Smartphone size={18} /></button>
        </div>
      </header>

      {/* PREMIUM TRIAL CARD */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-4 text-white shadow-lg flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{trialDays > 0 ? "Premium Trial Active" : "Trial Expired"}</span>
            <h3 className="text-base font-black mt-1">{trialDays > 0 ? `${trialDays} Days Remaining` : "Upgrade Plan"}</h3>
          </div>
          <button className="bg-white text-orange-600 text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-md">Upgrade</button>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <main className="px-4 space-y-5">
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 text-white p-4 rounded-2xl h-28 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold">TODAY'S SALES</span>
            <span className="text-2xl font-black">₹{counts.todaySales}</span>
          </div>
          <div onClick={() => setModalType('udhaar')} className="bg-white p-4 rounded-2xl border border-slate-200 h-28 flex flex-col justify-between cursor-pointer">
            <span className="text-[10px] text-slate-500 font-bold">TOTAL UDHAAR</span>
            <span className="text-2xl font-black text-rose-500">₹{counts.totalUdhaar}</span>
          </div>
          <div onClick={() => setModalType('stock')} className="bg-white p-4 rounded-2xl border border-slate-200 h-28 flex flex-col justify-between cursor-pointer">
            <span className="text-[10px] text-slate-500 font-bold">LOW STOCK</span>
            <span className="text-2xl font-black text-slate-900">{lowStockList.length} Items</span>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-4 rounded-2xl h-28 flex flex-col justify-between">
            <span className="text-[10px] text-indigo-100 font-bold">NET PROFIT</span>
            <span className="text-2xl font-black">₹{counts.monthProfit}</span>
          </div>
        </section>

        {/* QUICK ACTIONS & SCANNERS */}
        <section className="grid grid-cols-2 gap-3">
          <button onClick={() => router.push('/purchases/new')} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl"><PlusCircle className="text-emerald-600" /><span className="text-xs font-bold">New Sale</span></button>
          <button onClick={() => router.push('/stock/new')} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl"><ShoppingBag className="text-indigo-600" /><span className="text-xs font-bold">Add Product</span></button>
          <button onClick={() => setModalType('scanner')} className="flex items-center justify-center gap-2 p-3 bg-slate-900 text-white border border-slate-900 rounded-xl col-span-2 shadow-md"><ScanLine className="text-amber-400" /><span className="text-xs font-bold">Quick Camera & QR Scanner</span></button>
        </section>

        {/* UTILITIES */}
        <section className="grid grid-cols-3 gap-2">
          <div onClick={() => setModalType('quotation')} className="bg-white border border-slate-200 rounded-xl p-3 text-center cursor-pointer"><FileText size={16} className="mx-auto text-amber-500 mb-1" /><span className="text-[10px] font-bold text-slate-700">Quotations</span></div>
          <div onClick={() => router.push('/reports')} className="bg-white border border-slate-200 rounded-xl p-3 text-center cursor-pointer"><ArrowUpRight size={16} className="mx-auto text-blue-500 mb-1" /><span className="text-[10px] font-bold text-slate-700">Reports</span></div>
          <div onClick={() => setModalType('profile')} className="bg-white border border-slate-200 rounded-xl p-3 text-center cursor-pointer"><Settings size={16} className="mx-auto text-purple-500 mb-1" /><span className="text-[10px] font-bold text-slate-700">Profile Settings</span></div>
        </section>
      </main>
      {/* ALL POPUP MODALS */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-h-[80vh] bg-white rounded-t-3xl p-5 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="text-xs font-bold uppercase text-slate-400">{modalType} Management Panel</h3>
              <button onClick={() => setModalType(null)} className="w-6 h-6 bg-slate-100 rounded-full font-bold text-xs text-slate-500">✕</button>
            </div>

            {modalType === 'stock' && (
              <div className="space-y-2">
                {lowStockList.map((item, i) => (
                  <div key={i} className="flex justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold">
                    <span>{item.name}</span><span className="text-rose-600">Stock: {item.current_balance}</span>
                  </div>
                ))}
              </div>
            )}

            {modalType === 'profile' && currentBusiness && (
              <div className="text-center space-y-3">
                <p className="text-sm font-black">{currentBusiness.name}</p>
                <p className="text-xs text-slate-500">Owner: {currentBusiness.owner_name} | Phone: {currentBusiness.phone}</p>
                <button onClick={handleDeleteBusiness} className="w-full py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Trash2 size={14} /> Delete Business</button>
              </div>
            )}

            {modalType === 'scanner' && (
              <div className="text-center p-4 space-y-3">
                <ScanLine size={32} className="mx-auto text-indigo-600 animate-pulse" />
                <p className="text-xs text-slate-600 font-semibold">Camera Scanner Ready...</p>
              </div>
            )}

            {modalType === 'quotation' && (
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                <div className="p-3 bg-slate-50 border rounded-xl">Kismat Scrip</div>
                <div className="p-3 bg-slate-50 border rounded-xl">Koyal Scrip</div>
              </div>
            )}

            {modalType === 'notifications' && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between items-center font-bold">
                <span>Low Stock Push Alerts</span>
                <input type="checkbox" checked={isStockNotifOn} onChange={(e) => setIsStockNotifOn(e.target.checked)} className="w-4 h-4 text-indigo-600" />
              </div>
            )}

            {modalType === 'udhaar' && (
              <div className="text-center p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 block">TOTAL UDHAAR OUTSTANDING</span>
                <h2 className="text-2xl font-black text-rose-500 mt-1">₹{counts.totalUdhaar}</h2>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM PREMIUM NAVIGATION BAR */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 shadow-lg">
        <Link href="/owner" className="flex flex-col items-center gap-0.5 text-indigo-600"><Building2 size={18} /><span className="text-[9px] font-bold">Home</span></Link>
        <Link href="/orders" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"><ShoppingBag size={18} /><span className="text-[9px] font-semibold">Orders</span></Link>
        <Link href="/sales" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"><FileText size={18} /><span className="text-[9px] font-semibold">Sales</span></Link>
        <Link href="/settings" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"><Settings size={18} /><span className="text-[9px] font-semibold">Settings</span></Link>
      </nav>

    </div>
  );
}
