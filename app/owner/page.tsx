'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCurrentBusinessId, setCurrentBusinessId } from '@/lib/business';

type Business = {
  id: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
};

export default function OwnerDashboard() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
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

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // 1. Check User Role
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single();
      const role = profile?.user_type || 'shopkeeper';
      setUserRole(role);

      // Redirect if not a shopkeeper/business
      if (role === 'service_provider') { router.push('/services'); return; }
      if (role === 'customer') { router.push('/customer'); return; }

      // 2. Fetch Businesses
      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at');

      if (!bizData || bizData.length === 0) {
        // No business found (Redirect to add business)
        setLoading(false);
        return; 
      }

      setAllBusinesses(bizData);
      
      const storedBizId = getCurrentBusinessId();
      let activeBiz = bizData[0]; 

      if (storedBizId) {
        activeBiz = bizData.find((b: any) => b.id === storedBizId) || bizData[0];
      }

      setCurrentBusinessId(activeBiz.id);
      setCurrentBusiness(activeBiz);
      
      // 3. Calculate Trial Days (15 days from creation)
      if (activeBiz.created_at) {
        const start = new Date(activeBiz.created_at).getTime();
        const now = new Date().getTime();
        const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        const daysLeft = 15 - daysPassed;
        setTrialDays(daysLeft > 0 ? daysLeft : 0);
      }

      // 4. Fetch Dashboard Stats
      const [custRes, prodRes, salesRes] = await Promise.all([
        supabase.from('customers').select('id, current_balance').eq('business_id', activeBiz.id),
        supabase.from('products').select('*').eq('business_id', activeBiz.id),
        supabase.from('sales').select('total_amount, created_at').eq('business_id', activeBiz.id)
      ]);

      const customers = custRes.data || [];
      const products = prodRes.data || [];
      const sales = salesRes.data || [];

      // Calculations
      setTotalUdhaar(customers.reduce((sum, c) => sum + (c.current_balance || 0), 0));
      const lowStock = products.filter(p => p.stock_qty <= (p.low_stock_limit || 5));
      setLowStockCount(lowStock.length);
      setLowStockItems(lowStock);

      let salesAmt = 0;
      let profitAmt = 0;
      const today = new Date().toISOString().split('T')[0];
      
      sales.forEach(s => {
        if (s.created_at.startsWith(today)) salesAmt += Number(s.total_amount || 0);
        profitAmt += Number(s.total_amount || 0); 
      });
      
      setTodaySales(salesAmt);
      setTotalProfit(profitAmt * 0.2); // Dummy 20% profit margin for now

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleBusinessSwitch(id: string) {
    setIsBizDropdownOpen(false);
    setCurrentBusinessId(id);
    window.location.reload();
  }

  async function handleDeleteBusiness() {
    if (!currentBusiness) return;
    if (window.confirm(`Are you sure you want to delete "${currentBusiness.name}"?`)) {
      const { error } = await supabase.from('businesses').delete().eq('id', currentBusiness.id);
      if (!error) {
        localStorage.removeItem('selectedBusinessId');
        window.location.reload();
      } else {
        alert("Error: " + error.message);
      }
    }
  }

  async function handleDeleteAccount() {
    const confirmDelete = window.confirm("Kya aap sach me apna account delete karna chahte hain? Aapka saara data chala jayega.");
    if (!confirmDelete) return;

    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      alert('Delete failed: ' + error.message);
    } else {
      alert('Account deleted successfully.');
      await supabase.auth.signOut();
      window.location.href = '/signup';
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }
  const todayDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white px-4 py-3 sticky top-0 z-40 border-b border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">V</div>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight tracking-tight">VyapaarSetu</h1>
            <p className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase">Owner Panel</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <button 
              onClick={() => setIsBizDropdownOpen(!isBizDropdownOpen)}
              className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 max-w-[110px] active:scale-95 transition"
            >
              <span className="truncate">{currentBusiness?.name || 'Dukaan...'}</span>
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
                      {b.name}
                    </button>
                  ))}
                </div>
                <div className="p-2 bg-slate-50 border-t border-slate-200 flex flex-col gap-1">
                  <button onClick={() => router.push('/settings/business/new')} className="text-left px-2 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-white rounded transition-colors flex items-center gap-1">
                    <span className="text-sm">+</span> Add New Business
                  </button>
                  <button onClick={handleDeleteBusiness} className="text-left px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-white rounded transition-colors">🗑️ Delete Business</button>
                </div>
              </div>
            )}
          </div>
          
          <button onClick={() => setModalType('notifications')} className="relative text-lg active:scale-90 transition-transform">
            🔔<span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
          </button>
          
          <button onClick={() => setModalType('profile')} className="w-9 h-9 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm shadow-sm active:scale-90 transition-transform">
            👤
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-6 max-w-md mx-auto">
        
        {/* Business Info Card */}
        {currentBusiness ? (
          <div className="relative overflow-hidden border border-slate-200 shadow-sm bg-white p-4 rounded-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-emerald-100">
                  {userRole === 'business' ? '🏭' : '🏪'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 line-clamp-1">{currentBusiness.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Owner: {currentBusiness.owner_name || 'Not Set'}</p>
                  {currentBusiness.phone && (
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">📞 {currentBusiness.phone}</p>
                  )}
                  {currentBusiness.city && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">📍 {currentBusiness.city}</p>
                  )}
                </div>
              </div>
              <button onClick={() => router.push('/settings/business')} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 active:scale-95 transition-all">✏️ Edit</button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl text-center shadow-sm border border-slate-200">
             <p className="text-slate-600 mb-3">Aapne abhi tak koi dukaan nahi jodi hai.</p>
             <button onClick={() => router.push('/settings/business/new')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Add Business Now</button>
          </div>
        )}

        {/* Premium Trial Banner */}
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
          <Link href="/pricing" className="relative z-10 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 active:scale-95 transition-all">Upgrade →</Link>
        </div>
        {/* Business Overview */}
        <div className="flex items-center justify-between mt-6 mb-3 px-1">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Business Overview</h2>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
            <span className="text-[10px]">📅</span>
            <span className="text-[11px] font-semibold text-slate-600">{todayDate}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/sales" className="active:scale-95 transition-transform !bg-[#1e1e24] border-0 text-white shadow-md relative overflow-hidden rounded-2xl p-4 block">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">Today's Sales</p>
              <span className="text-sm bg-white/10 p-1.5 rounded-lg">📈</span>
            </div>
            <p className="text-2xl font-black relative z-10 tracking-tight">₹{todaySales.toLocaleString('en-IN')}</p>
          </Link>

          <Link href="/customers" className="active:scale-95 transition-transform border border-slate-200 shadow-sm relative overflow-hidden bg-white rounded-2xl p-4 block">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Total Udhaar</p>
              <span className="text-sm bg-rose-50 text-rose-500 p-1.5 rounded-lg">👥</span>
            </div>
            <p className="text-2xl font-black text-rose-500 tracking-tight">₹{totalUdhaar.toLocaleString('en-IN')}</p>
          </Link>

          <Link href="/products" className="active:scale-95 transition-transform border border-slate-200 shadow-sm relative overflow-hidden bg-white rounded-2xl p-4 block">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Low Stock</p>
              <span className="text-sm bg-amber-50 text-amber-500 p-1.5 rounded-lg">⚠️</span>
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
              {lowStockCount} <span className="text-xs font-medium text-slate-400">Items</span>
            </p>
          </Link>

          <Link href="/reports" className="active:scale-95 transition-transform bg-gradient-to-br from-indigo-600 to-violet-600 border-0 text-white shadow-md relative overflow-hidden rounded-2xl p-4 block">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[11px] font-semibold tracking-wider text-indigo-100 uppercase">Net Profit</p>
            </div>
            <p className="text-2xl font-black relative z-10 tracking-tight">₹{totalProfit.toLocaleString('en-IN')}</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/sales/new" className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">🛒</div>
              <p className="text-sm font-bold text-slate-800">New Sale</p>
            </Link>
            <Link href="/products" className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">📦</div>
              <p className="text-sm font-bold text-slate-800">Product & Stock</p>
            </Link>
            <Link href="/products/new" className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">🛍️</div>
              <p className="text-sm font-bold text-slate-800">Add Product</p>
            </Link>
            <Link href="/customers/new" className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-lg">👤</div>
              <p className="text-sm font-bold text-slate-800">Add Customer</p>
            </Link>
          </div>
        </section>

        {/* Business Modules */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">Business Modules</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Purchases', icon: '🛍️', link: '/purchases', color: 'bg-pink-50 text-pink-600' },
              { name: 'Customers', icon: '👥', link: '/customers', color: 'bg-blue-50 text-blue-600' },
              { name: 'Suppliers', icon: '🚚', link: '/suppliers', color: 'bg-orange-50 text-orange-600' },
              { name: 'Udhaar & Pay', icon: '💰', link: '/payments', color: 'bg-yellow-50 text-yellow-600' },
              { name: 'Expenses', icon: '💵', link: '/expenses', color: 'bg-green-50 text-green-600' },
              { name: 'Reports & GST', icon: '📊', link: '/reports', color: 'bg-teal-50 text-teal-600' },
              { name: 'Staff & Perms', icon: '🛡️', link: '/settings/workers', color: 'bg-cyan-50 text-cyan-600' },
            ].map(module => (
              <Link key={module.name} href={module.link} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2 shadow-sm active:scale-95 transition-transform">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${module.color}`}>{module.icon}</div>
                <p className="text-xs font-bold text-slate-800">{module.name}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* More Features */}
        <section>
          <h2 className="text-sm font-black text-slate-800 mb-3 px-1 tracking-tight">More Features</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/reports" className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg">📈</div>
              <p className="text-[10px] font-bold text-slate-800 text-center">Reports<br/>Analysis</p>
            </Link>
            <button onClick={() => alert('E-commerce module coming soon!')} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg">🌐</div>
              <p className="text-[10px] font-bold text-slate-800 text-center">E-<br/>commerce</p>
            </button>
            <button onClick={() => alert('Quotation module coming soon!')} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg">📝</div>
              <p className="text-[10px] font-bold text-slate-800 text-center">Quotation</p>
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
                {modalType === 'profile' ? 'My Profile' : modalType === 'lowStock' ? 'Low Stock Alerts' : 'Notifications'}
              </h3>
              <button onClick={() => setModalType(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">✕</button>
            </div>

            {modalType === 'notifications' && (
              <div className="text-center py-6">
                <span className="text-4xl mb-3 block">🔔</span>
                <p className="text-sm text-slate-500">No new notifications right now.</p>
              </div>
            )}

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
                      <p className="text-sm font-black text-rose-500">{item.stock_qty} <span className="text-[9px] text-slate-400">Left</span></p>
                    </div>
                  ))
                )}
              </div>
            )}

            {modalType === 'profile' && (
              <div className="flex flex-col items-center py-4">
                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-3xl mb-3 border border-indigo-100 shadow-sm">👤</div>
                <p className="text-base font-bold text-slate-800">{currentBusiness?.owner_name || 'Owner'}</p>
                <p className="text-xs text-slate-500 mb-5">{currentBusiness?.phone || 'Phone'}</p>
                
                <button onClick={() => { setModalType(null); router.push('/settings/business'); }} className="w-full border border-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl hover:bg-slate-50 transition mb-3">
                  Edit Business Details
                </button>
                
                {/* DELETE ACCOUNT BUTTON */}
                <button onClick={handleDeleteAccount} className="w-full bg-red-50 text-red-600 border border-red-200 font-bold text-xs py-3 rounded-xl hover:bg-red-100 transition">
                  🗑️ Delete My Account
                </button>
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
        <Link href="/orders" className="flex flex-col items-center gap-1 text-slate-400">
          <span className="text-lg">🛒</span>
          <span className="text-[10px] font-semibold">Orders</span>
        </Link>
        <button onClick={() => setModalType('scanner')} className="flex flex-col items-center justify-center bg-slate-900 text-white w-14 h-14 rounded-full -mt-6 shadow-lg border-4 border-white active:scale-95 transition-transform">
          <span className="text-xl">📸</span>
        </button>
        <Link href="/sales" className="flex flex-col items-center gap-1 text-slate-400">
          <span className="text-lg">📄</span>
          <span className="text-[10px] font-semibold">Sales</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-slate-400">
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-semibold">Settings</span>
        </Link>
      </nav>
    </main>
  );
}