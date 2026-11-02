'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerSuperAppHome() {
  const router = useRouter();
  const supabase = createClient();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setUserProfile(profile);
        
        const { data: notifs } = await supabase.from('notifications').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(10);
        if (notifs) setNotifications(notifs);
      }

      const { data: catData } = await supabase.from('shop_categories').select('*').eq('is_active', true).limit(7);
      if (catData) setCategories(catData);

      const { data: prodData } = await supabase.from('products').select(`*, businesses!inner(name)`).gt('stock', 0).order('created_at', { ascending: false }).limit(4);
      if (prodData) setTopProducts(prodData);
    };
    fetchData();
  }, [supabase]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('customer_id', user.id).eq('is_read', false);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/customer/explore?search=${searchQuery}`);
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] pb-24 font-sans">
      
      {/* TOP HEADER */}
      <header className="bg-blue-600 text-white pt-4 pb-6 px-4 rounded-b-3xl relative shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 text-xl font-black">🏪</div>
            <div>
              <h1 className="text-lg font-black leading-tight tracking-wide">VyapaarSetu</h1>
              <p className="text-blue-100 text-[10px]">Smart Dukaan, Smart Aapke Liye</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAsRead(); }} className="relative">
              <span className="text-2xl">🔔</span>
              {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-blue-600"></span>}
            </button>
            <Link href="/customer/profile" className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              {userProfile?.full_name ? userProfile.full_name.charAt(0) : 'M'}
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-xl flex items-center p-2 shadow-sm">
          <span className="text-gray-400 pl-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search for products, services..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm px-3 text-gray-700 font-medium" 
          />
          <button type="button" className="text-blue-600 text-xl pr-2">📷</button>
        </form>
      </header>

      <div className="px-3 space-y-5 mt-4 max-w-2xl mx-auto">
        
        {/* HERO BANNER */}
        <section>
          <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl p-5 relative overflow-hidden flex items-center shadow-sm">
            <div className="relative z-10 w-3/5">
              <h2 className="text-xl font-black text-blue-900 leading-tight">Sab Kuch Ek Hi App Mein</h2>
              <p className="text-sm text-blue-800 font-medium mt-1">Dukaan Manage Karein,<br/>Aur Bhi Aasaan Tarike Se!</p>
              <Link href="/customer/explore" className="bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-lg mt-3 shadow-md flex items-center gap-1 w-max">
                Explore Now →
              </Link>
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] text-7xl opacity-90">🏪</div>
          </div>
        </section>

        {/* QUICK ACTIONS (Customer Focused + Explore) */}
        <section>
          <div className="grid grid-cols-4 gap-y-4 gap-x-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <Link href="/customer/shop" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">🛒</div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">Shop<br/>Now</span>
            </Link>
            
            {/* 👇 Explore Button */}
            <Link href="/customer/explore" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl text-blue-600">🧭</div>
              <span className="text-[10px] font-bold text-blue-700 text-center leading-tight">Explore<br/>Services</span>
            </Link>

            <Link href="/customer/rides" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">🏍️</div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">Book<br/>Ride</span>
            </Link>
            <Link href="/customer/rides?type=parcel" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">📦</div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">Send<br/>Parcel</span>
            </Link>
            <Link href="/customer/orders" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">🕒</div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">My<br/>Orders</span>
            </Link>
            <Link href="/customer/bookings" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">📅</div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">My<br/>Bookings</span>
            </Link>
            <Link href="/customer/requests" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">📄</div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">My<br/>Quotes</span>
            </Link>
            <Link href="/customer/support" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">🎧</div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">Help<br/>Support</span>
            </Link>
          </div>
        </section>

        {/* SHOP BY CATEGORY */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-black text-gray-800 flex items-center gap-2"><span className="w-1 h-4 bg-blue-600 rounded-full"></span> Shop by Category</h2>
            <Link href="/customer/shop" className="text-xs font-bold text-blue-600">View All ›</Link>
          </div>
          
          <div className="grid grid-cols-4 gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            {categories.map((cat) => (
              <Link href={`/customer/shop?cat=${cat.name}`} key={cat.id} className="flex flex-col items-center gap-1.5 active:scale-95 transition">
                <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-3xl">
                  {cat.icon || '📦'}
                </div>
                <span className="text-[10px] font-bold text-gray-700 text-center leading-tight line-clamp-2">{cat.name}</span>
              </Link>
            ))}
            <Link href="/customer/shop" className="flex flex-col items-center gap-1.5 active:scale-95 transition">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-2xl text-blue-600 font-black">
                •••
              </div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">More<br/>Categories</span>
            </Link>
          </div>
        </section>

        {/* SPECIAL DEALS */}
        <section>
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 flex items-center justify-between border border-purple-200 shadow-sm">
            <div>
              <h3 className="text-purple-900 font-black text-base flex items-center gap-1">🏷️ Special Deals for You</h3>
              <p className="text-purple-700 text-[10px] font-medium mt-1">Save more on your favorite products</p>
            </div>
            <Link href="/customer/shop" className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md">Shop Now →</Link>
          </div>
        </section>

        {/* RECOMMENDED FOR YOU */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-black text-gray-800 flex items-center gap-2"><span className="w-1 h-4 bg-blue-600 rounded-full"></span> Recommended for You</h2>
            <Link href="/customer/shop" className="text-xs font-bold text-blue-600">View All ›</Link>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-500 w-full text-center py-4 bg-white rounded-xl">No products available right now.</p>
            ) : (
              topProducts.map(prod => {
                const discount = prod.mrp && prod.mrp > prod.selling_price 
                  ? Math.round(((prod.mrp - prod.selling_price) / prod.mrp) * 100) 
                  : 0;

                return (
                  <div key={prod.id} className="min-w-[140px] w-[140px] bg-white rounded-2xl shadow-sm border border-gray-100 p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="h-24 bg-gray-50 rounded-xl mb-2 flex items-center justify-center text-3xl text-gray-300 relative">
                        {prod.name.charAt(0)}
                        {discount > 0 && (
                          <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {discount}% OFF
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-800 text-xs line-clamp-2 leading-tight">{prod.name}</h4>
                      <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">{prod.businesses?.name}</p>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-black text-gray-900">₹{prod.selling_price}</p>
                        {prod.mrp && prod.mrp > prod.selling_price && (
                          <p className="text-[10px] text-gray-400 line-through">₹{prod.mrp}</p>
                        )}
                      </div>
                      <Link href="/customer/shop" className="mt-2 w-full bg-blue-50 text-blue-700 font-bold text-xs py-1.5 rounded-lg flex items-center justify-center border border-blue-100">
                        Add
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <Link href="/customer" className="flex flex-col items-center gap-1 text-blue-600">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/customer/shop" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600">
          <span className="text-xl">🛍️</span>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        
        <div className="relative -top-5">
          <Link href="/customer/explore" className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border-4 border-white">
            🧭
          </Link>
        </div>

        <Link href="/customer/my-rides" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 relative">
          <span className="text-xl">🏍️</span>
          <span className="text-[10px] font-medium">Rides</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>

      {/* NOTIFICATION DROPDOWN */}
      {showNotifications && (
        <div className="absolute top-16 right-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
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
                <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}