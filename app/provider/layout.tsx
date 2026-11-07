'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const activeId = getCurrentBusinessId();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState({ name: 'Provider', photo: '' });
  
  // Trial States
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [hasActiveSub, setHasActiveSub] = useState(true);
  const [isCheckingSub, setIsCheckingSub] = useState(true);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // 1. Fetch Notifications
  useEffect(() => {
    if (!activeId) return;
    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('business_id', activeId).order('created_at', { ascending: false }).limit(10);
      if (data) setNotifications(data);
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [activeId, supabase]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async () => {
    if (unreadCount === 0 || !activeId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('business_id', activeId).eq('is_read', false);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  // 2. Fetch Status & Subscription
  useEffect(() => {
    if (!activeId) return;

    const checkStatusAndSubscription = async () => {
      const { data } = await supabase.from('businesses').select('name, is_online, logo_url, trial_ends_at').eq('id', activeId).single();
      if (data) {
        setIsOnline(data.is_online ?? false);
        setProfile({ name: data.name || 'Provider', photo: data.logo_url || '' });
        
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('business_id', activeId)
          .eq('status', 'active') // Sirf active plan count hoga
          .gt('current_period_end', new Date().toISOString())
          .maybeSingle();

        if (sub) {
          setHasActiveSub(true);
          setIsTrialExpired(false);
        } else {
          setHasActiveSub(false);
          if (data.trial_ends_at) {
            const trialEnd = new Date(data.trial_ends_at).getTime();
            const now = new Date().getTime();
            const days = Math.ceil((trialEnd - now) / (1000 * 3600 * 24));
            
            if (days > 0) {
              setTrialDaysLeft(days);
            } else {
              setIsTrialExpired(true);
            }
          } else {
            setIsTrialExpired(true);
          }
        }
      }
      setIsCheckingSub(false);
    };
    checkStatusAndSubscription();
  }, [activeId, supabase]);

  // 👇 STRICT REDIRECT LOGIC (Agar trial khatam, toh sirf plans page khule)
  useEffect(() => {
    if (!isCheckingSub && isTrialExpired && pathname !== '/provider/plans') {
      router.push('/provider/plans');
    }
  }, [isTrialExpired, isCheckingSub, pathname, router]);

  const toggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    if (activeId) {
      await supabase.from('businesses').update({ is_online: newStatus }).eq('id', activeId);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/provider', icon: '🏠' },
    { name: 'Bookings', path: '/provider/bookings', icon: '🗓️' },
    { name: 'Quotations', path: '/provider/quotations', icon: '📄' },
    { name: 'Team / Workers', path: '/provider/team', icon: '👥' },
    { name: 'Inventory', path: '/provider/inventory', icon: '📦' },
    { name: 'Shop Orders', path: '/provider/orders', icon: '🛍️' },
    { name: 'Ride Requests', path: '/provider/rides', icon: '🏍️' },
    { name: 'My Services', path: '/provider/services', icon: '🛠️' },
    { name: 'Sales', path: '/provider/sales', icon: '🧾' },
    { name: 'Expenses', path: '/provider/expenses', icon: '💸' },
    { name: 'Purchases', path: '/provider/purchases', icon: '🛒' },
    { name: 'Earnings', path: '/provider/earnings', icon: '💰' },
    { name: 'Reports', path: '/provider/reports', icon: '📊' },
    { name: 'Reviews', path: '/provider/reviews', icon: '⭐' },
    { name: 'Plans & Upgrade', path: '/provider/plans', icon: '🚀' },
    { name: 'Settings', path: '/provider/settings', icon: '⚙️' },
    { name: 'My Profile', path: '/provider/profile', icon: '👤' },
  ];
  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B192C] text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">V</div>
          <span className="text-xl font-bold tracking-wide">VyapaarSetu</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.name}>
                  <Link 
                    href={item.path} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}
                  >
                    <span>{item.icon}</span> {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link href="/owner" className="block w-full text-center bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-semibold transition">← Main Panel</Link>
          <button onClick={handleLogout} className="block w-full text-center bg-red-500/20 text-red-400 hover:bg-red-500/30 py-2 rounded-lg text-sm font-semibold transition">Logout</button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* HEADER */}
        {pathname !== '/provider/rides' && (
          <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm z-20">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-600 text-2xl">☰</button>
              <h1 className="text-lg font-bold text-gray-800 hidden md:block">Provider Workspace</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <button onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAsRead(); }} className="relative p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition">
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                
                {showNotifications && (
                  <div className="fixed top-16 right-4 md:right-8 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-100 z-[999] max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0">
                      <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-xs font-bold text-blue-600">Close</button>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">No new notifications.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 border-b border-gray-50 text-sm ${n.is_read ? 'bg-white' : 'bg-blue-50'}`}>
                          <p className="font-bold text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button onClick={toggleOnline} className={`flex items-center gap-2 border px-3 py-1.5 rounded-full transition ${isOnline ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-300'}`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span className={`text-xs font-bold ${isOnline ? 'text-green-700' : 'text-gray-600'}`}>{isOnline ? 'Online' : 'Offline'}</span>
              </button>

              <Link href="/provider/profile" className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold overflow-hidden border border-blue-200">
                {profile.photo ? <img src={profile.photo} alt="P" className="w-full h-full object-cover" /> : profile.name.charAt(0).toUpperCase()}
              </Link>
            </div>
          </header>
        )}

        {/* 👇 TRIAL EXPIRED BANNER (Only on plans page) */}
        {isTrialExpired && pathname === '/provider/plans' && (
          <div className="bg-red-500 text-white p-3 text-center shadow-md z-10">
            <p className="text-sm font-bold">Your trial has expired. Please upgrade to a plan to continue using the app.</p>
          </div>
        )}

        {/* 👇 TRIAL ACTIVE BANNER (For other pages) */}
        {!hasActiveSub && !isTrialExpired && trialDaysLeft > 0 && (
          <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white p-3 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-2">
              <span className="text-xl">⏰</span>
              <div>
                <p className="text-sm font-bold">Free Trial Active</p>
                <p className="text-[10px] text-orange-100">{trialDaysLeft} days remaining</p>
              </div>
            </div>
            <Link href="/provider/plans" className="bg-white text-red-600 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 transition active:scale-95">
              Upgrade Now
            </Link>
          </div>
        )}

        {/* PAGE CONTENT */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8`}>
          {children}
        </main>
      </div>

    </div>
  );
}