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
  const [isOnline, setIsOnline] = useState(true);
  const [profile, setProfile] = useState({ name: 'Provider', photo: '' });

  useEffect(() => {
    // Fetch online status and profile basic info
    const fetchStatus = async () => {
      if (!activeId) return;
      const { data } = await supabase.from('businesses').select('name, is_online, logo_url').eq('id', activeId).single();
      if (data) {
        setIsOnline(data.is_online ?? true);
        setProfile({ name: data.name, photo: data.logo_url || '' });
      }
    };
    fetchStatus();
  }, [activeId, supabase]);

  const toggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await supabase.from('businesses').update({ is_online: newStatus }).eq('id', activeId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

    // Navigation Links Menu
  const menuItems = [
    { name: 'Dashboard', path: '/provider', icon: '🏠' },
    { name: 'Bookings', path: '/provider/bookings', icon: '📅' },
    { name: 'Quotations', path: '/provider/quotations', icon: '📄' },
    { name: 'Team / Workers', path: '/provider/team', icon: '👥' },
    { name: 'Inventory', path: '/provider/inventory', icon: '📦' },
{ name: 'Sales', path: '/provider/sales', icon: '🧾' },
{ name: 'Expenses', path: '/provider/expenses', icon: '💸' },
{ name: 'Purchases', path: '/provider/purchases', icon: '🛒' },
    { name: 'Earnings', path: '/provider/earnings', icon: '💰' },
{ name: 'Reports', path: '/provider/reports', icon: '📊' },
    { name: 'Reviews', path: '/provider/reviews', icon: '⭐' }, // 👈 Ye nayi line add ki hai
{ name: 'Settings', path: '/provider/settings', icon: '⚙️' },
    { name: 'Plans & Upgrade', path: '/provider/plans', icon: '🚀' },
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-600 text-2xl">☰</button>
            <h1 className="text-lg font-bold text-gray-800 hidden md:block">Provider Workspace</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={toggleOnline} className={`flex items-center gap-2 border px-3 py-1.5 rounded-full transition ${isOnline ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span className={`text-xs font-bold ${isOnline ? 'text-green-700' : 'text-gray-600'}`}>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
            <Link href="/provider/profile" className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold overflow-hidden border border-blue-200">
              {profile.photo ? <img src={profile.photo} alt="P" className="w-full h-full object-cover" /> : profile.name.charAt(0)}
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}