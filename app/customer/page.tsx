'use client';
import PlanStatusBanner from '@/components/PlanStatusBanner';
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerSuperAppHome() {
  const router = useRouter();
  const supabase = createClient();
  
  // Data States
  const [categories, setCategories] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  
  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomData, setZoomData] = useState<{ images: string[]; index: number; title: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [activeCat, setActiveCat] = useState('For You');
  const [activeTab, setActiveTab] = useState<'supermart' | 'services' | 'rides' | 'loans'>('supermart');
  const [bannerIdx, setBannerIdx] = useState(0);
  const promoBanners = [
    { title: "Mega Super Sale", sub: "Up to 50% OFF on Electronics, Fashion & Daily Essentials", tag: "SUPER DEAL", bg: "from-indigo-600 via-blue-600 to-cyan-500", emoji: "🛍️", href: "/customer/shop" },
    { title: "Expert Home Services", sub: "Electrician, Plumber, AC Repair & Cleaning at Doorstep", tag: "INSTANT BOOKING", bg: "from-emerald-600 via-teal-600 to-green-500", emoji: "🛠️", href: "/customer/explore" },
    { title: "Quick Business & Personal Loan", sub: "Easy Paperless Approval • Low Interest • Fast Disbursal", tag: "FINANCE", bg: "from-amber-500 via-orange-600 to-red-500", emoji: "💰", href: "/customer/request-quote" },
    { title: "Fast City Rides & Delivery", sub: "Book Bike, Auto or Cab in Seconds Near You", tag: "24x7 RIDES", bg: "from-purple-600 via-violet-600 to-fuchsia-600", emoji: "🚖", href: "/customer/rides" }
  ];
  const [slides, setSlides] = useState<Record<string, number>>({});
  const getPhotos = (p: any): string[] => {
    const a = Array.isArray(p?.images) ? p.images.filter((x: any) => typeof x === "string" && x) : [];
    if (p?.image_url && !a.includes(p.image_url)) a.unshift(p.image_url);
    return a;
  };
  const openZoom = (images: string[], index: number, title: string) => { setZoomScale(1); setZoomData({ images, index, title }); };

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch User Profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setUserProfile(profile);
        const { data: ordData } = await supabase.from('orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(20);
        if (ordData) setMyOrders(ordData);
        const { data: bkgData } = await supabase.from('service_bookings').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(5);
        if (bkgData) setMyBookings(bkgData);
        
        // Fetch Notifications
        const { data: notifs } = await supabase.from('notifications').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(10);
        if (notifs) setNotifications(notifs);
      }

      // 2. Fetch Shop Categories (Top 7 for the grid + 1 for "More")
      const { data: catData } = await supabase.from('shop_categories').select('*').eq('is_active', true).limit(7);
      if (catData) setCategories(catData);

      // 3. Fetch Recommended Products (Latest 4)
      const { data: prodData } = await supabase
        .from('products')
        .select(`*, businesses!inner(name)`)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(8);
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
    <main className="min-h-screen bg-[#F1F3F6] pb-24 font-sans">
      <header className="bg-gradient-to-b from-[#0F172A] via-[#1E3A8A] to-[#1D4ED8] text-white pt-3 pb-2.5 rounded-b-3xl shadow-md sticky top-0 z-30">
        <div className="grid grid-cols-4 gap-2 px-3 mb-2.5">
          {[
            { id: 'supermart', label: 'SuperMart', icon: '🛒' },
            { id: 'services', label: 'Services', icon: '🛠️' },
            { id: 'rides', label: 'Rides', icon: '🚖' },
            { id: 'loans', label: 'Loans', icon: '💰' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl py-1.5 px-1 flex flex-col items-center justify-center shadow-sm active:scale-95 transition ${activeTab === tab.id ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200' : 'bg-white text-slate-900'}`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[10px] font-black mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-3.5 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-700 font-black text-xs shadow">VS</div>
            <div>
              <h1 className="text-sm font-black leading-none tracking-wide">VyapaarSetu</h1>
              <p className="text-[9px] text-blue-200 mt-0.5">All-in-One Super App • Shopping, Services & Finance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAsRead(); }} className="relative bg-white/15 p-1.5 rounded-full">
              <span className="text-sm">🔔</span>
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            <Link href="/customer/profile" className="w-7 h-7 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center font-black text-xs">
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mx-3 bg-white rounded-xl flex items-center px-3 py-1.5 shadow-inner">
          <span className="text-gray-400 text-sm">🔍</span>
          <input type="text" placeholder="Search mobiles, fashion, services, loans..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent outline-none text-xs px-2.5 py-1 text-gray-800 font-medium" />
          <Link href="/customer/shop" className="text-blue-600 text-base pl-1">📷</Link>
        </form>

        <div className="flex items-center gap-4 overflow-x-auto px-3.5 pt-2.5 pb-0.5 no-scrollbar">
          <button onClick={() => setActiveCat('For You')} className={`flex flex-col items-center shrink-0 pb-1 border-b-2 transition ${activeCat === 'For You' ? 'border-amber-400 text-amber-300' : 'border-transparent text-blue-100'}`}>
            <span className="text-lg">🛍️</span>
            <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">For You</span>
          </button>
          {[...categories].sort((a, b) => {
            const an = (a.name || '').toLowerCase();
            const bn = (b.name || '').toLowerCase();
            if (an.includes('grocery')) return -1;
            if (bn.includes('grocery')) return 1;
            if (an.includes('medicine')) return 1;
            if (bn.includes('medicine')) return -1;
            return 0;
          }).map((cat) => (
            <Link key={cat.id} href={`/customer/shop?cat=${cat.name}`} className="flex flex-col items-center shrink-0 pb-1 border-b-2 border-transparent hover:border-amber-400 text-blue-100 hover:text-white transition">
              {cat.image_url ? <img src={cat.image_url} alt={cat.name} className="w-6 h-6 rounded-md object-cover bg-white/20" /> : <span className="text-lg">{cat.icon || '📦'}</span>}
              <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap max-w-[64px] truncate">{cat.name}</span>
            </Link>
          ))}
        </div>
      </header>

      <div className="px-3 space-y-4 mt-3 max-w-2xl mx-auto">
        <PlanStatusBanner roleType="customer" upgradeHref="/pricing" />

        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-black text-slate-800">🏠 Home & Repair Services</h2>
                <Link href="/customer/explore" className="text-xs font-bold text-blue-600">All Services ›</Link>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { n: 'AC & Appliance', i: '❄️' }, { n: 'Plumber', i: '🔧' }, { n: 'Electrician', i: '⚡' }, { n: 'Carpenter', i: '🪚' },
                  { n: 'Painter', i: '🎨' }, { n: 'Labour & Helper', i: '👷' }, { n: 'Home Cleaning', i: '🧹' }, { n: 'Pest Control', i: '🐜' }
                ].map((s) => (
                  <Link key={s.n} href={`/customer/explore?service=${encodeURIComponent(s.n)}`} className="flex flex-col items-center gap-1 active:scale-95 transition">
                    <div className="w-13 h-13 rounded-full bg-slate-100 flex items-center justify-center text-2xl shadow-inner">{s.i}</div>
                    <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{s.n}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 mb-3">💻 IT, Telecom & Tech</h2>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { n: 'Wi-Fi & Internet', i: '📡' }, { n: 'CCTV & Security', i: '📷' }, { n: 'Computer & Laptop', i: '💻' }, { n: 'Mobile Repair', i: '📱' }
                ].map((s) => (
                  <Link key={s.n} href={`/customer/explore?service=${encodeURIComponent(s.n)}`} className="flex flex-col items-center gap-1 active:scale-95 transition">
                    <div className="w-13 h-13 rounded-full bg-blue-50 flex items-center justify-center text-2xl">{s.i}</div>
                    <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{s.n}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rides' && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800">🚖 Transport & Instant Rides</h2>
              <Link href="/customer/rides" className="text-xs font-bold text-blue-600">My Rides ›</Link>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { n: 'Bike Taxi', sub: 'Fast & Cheap', i: '🏍️' },
                { n: 'Car Rental', sub: 'City & Outstation', i: '🚗' },
                { n: 'Parcel Delivery', sub: 'Same Day Drop', i: '📦' }
              ].map((r) => (
                <Link key={r.n} href="/customer/rides" className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3 flex flex-col items-center text-center active:scale-95 transition">
                  <span className="text-3xl mb-1">{r.i}</span>
                  <span className="text-xs font-black text-slate-800">{r.n}</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">{r.sub}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800">💰 Instant Loans &amp; Finance</h2>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">Coming Soon</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { n: 'Personal Loan', sub: 'Zero Paperwork • Quick Disbursal', i: '💳' },
                { n: 'Phone Finance', sub: 'Easy 0% EMI on Smartphones', i: '📱' },
                { n: 'Gold Loan', sub: 'Highest Per Gram Rate • Instant Cash', i: '🪙' },
                { n: 'Vehicle Finance', sub: 'Bike, Car & Commercial Loans', i: '🚗' },
                { n: 'Home & Property Loan', sub: 'Low Interest • Flexible Tenure', i: '🏠' },
                { n: 'Business Loan', sub: 'Up to ₹10 Lakh • Grow Your Work', i: '🏦' }
              ].map((l) => (
                <button
                  key={l.n}
                  type="button"
                  onClick={() => alert(`${l.n} — Coming Soon! यह सुविधा बहुत जल्द लाइव होने वाली है।`)}
                  className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex flex-col justify-between text-left active:scale-95 transition relative overflow-hidden"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-2xl">{l.i}</span>
                    <span className="bg-white/90 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-200">SOON</span>
                  </div>
                  <p className="text-xs font-black text-slate-900">{l.n}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{l.sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div onScroll={(e) => { const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth); if (idx !== bannerIdx && idx >= 0 && idx < promoBanners.length) setBannerIdx(idx); }} className="flex overflow-x-auto snap-x snap-mandatory gap-2.5 no-scrollbar rounded-2xl">
            {promoBanners.map((b, i) => (
              <Link key={i} href={b.href} className={`min-w-full snap-center bg-gradient-to-r ${b.bg} rounded-2xl p-4 text-white flex items-center justify-between shadow-sm`}>
                <div className="max-w-[72%]">
                  <span className="inline-block bg-black/25 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider mb-1">{b.tag}</span>
                  <h2 className="text-lg font-black leading-tight">{b.title}</h2>
                  <p className="text-[11px] text-white/90 mt-1 leading-snug">{b.sub}</p>
                  <span className="inline-block mt-2.5 bg-white text-slate-900 text-[10px] font-black px-3 py-1 rounded-lg shadow-sm">Explore Now ›</span>
                </div>
                <div className="text-5xl drop-shadow-md">{b.emoji}</div>
              </Link>
            ))}
          </div>
          <div className="flex justify-center gap-1.5 mt-2">
            {promoBanners.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${bannerIdx === i ? 'w-5 bg-slate-800' : 'w-1.5 bg-slate-300'}`} />)}
          </div>
        </div>

        

        

        {/* NEW IN STORE */}
        

        {/* RECOMMENDED FOR YOU (With Multi-Photo Slider & Tap-to-Zoom) */}
        {/* MY ORDERS (Dark Blue Card - Screenshot 2 Style) */}
        <section className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] rounded-2xl p-3.5 text-white shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-black flex items-center gap-1.5">🛍️ My Orders</h2>
            <Link href="/customer/orders" className="text-xs font-bold text-blue-200">View All →</Link>
          </div>
          <div className="grid grid-cols-4 gap-2 text-slate-900">
            {[
              { label: 'Total Orders', count: myOrders.length, icon: '🛒', bg: 'bg-blue-50' },
              { label: 'Processing', count: myOrders.filter(o => ['pending', 'confirmed', 'processing'].includes((o.status || '').toLowerCase())).length, icon: '🕒', bg: 'bg-amber-50' },
              { label: 'Shipped', count: myOrders.filter(o => ['shipped', 'out_for_delivery', 'in_transit'].includes((o.status || '').toLowerCase())).length, icon: '🚚', bg: 'bg-sky-50' },
              { label: 'Delivered', count: myOrders.filter(o => (o.status || '').toLowerCase() === 'delivered').length, icon: '✅', bg: 'bg-emerald-50' }
            ].map((st) => (
              <Link key={st.label} href="/customer/orders" className={`${st.bg} rounded-xl p-2 flex flex-col items-center text-center shadow-sm active:scale-95 transition`}>
                <span className="text-base mb-0.5">{st.icon}</span>
                <span className="text-[9px] font-bold text-slate-600 leading-tight">{st.label}</span>
                <span className="text-sm font-black text-slate-900 mt-0.5">{st.count}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* MY SERVICES & BOOKINGS */}
        <section>
          <div className="flex justify-between items-center mb-2 px-1">
            <h2 className="text-sm font-black text-slate-800">My Services &amp; Bookings</h2>
            <Link href="/customer/bookings" className="text-xs font-bold text-blue-600">View All →</Link>
          </div>
          {myBookings.length > 0 ? (
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-lg shrink-0">🔧</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-slate-900 truncate">{myBookings.service_name || myBookings.title || 'Service Booking'}</p>
                    <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize">{myBookings.status || 'Confirmed'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">ID: #{String(myBookings.id).slice(0, 6).toUpperCase()}</p>
                </div>
              </div>
              <Link href="/customer/bookings" className="bg-indigo-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shrink-0">Track</Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-3 border border-gray-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">No active service bookings</span>
              <Link href="/customer/explore" className="text-xs font-bold text-blue-600">Book Service ›</Link>
            </div>
          )}
        </section>

        {/* RECENT ORDERS */}
        {myOrders.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-2 px-1">
              <h2 className="text-sm font-black text-slate-800">Recent Orders</h2>
              <Link href="/customer/orders" className="text-xs font-bold text-blue-600">View All →</Link>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">Order #{String(myOrders.id).slice(0, 6).toUpperCase()}</p>
                <p className="text-xs font-black text-blue-700 mt-0.5">₹{myOrders.total_amount || myOrders.amount || 0}</p>
                <p className="text-[10px] text-emerald-600 font-bold capitalize mt-0.5">• {myOrders.status || 'Placed'}</p>
              </div>
              <Link href="/customer/shop" className="border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">Order Again</Link>
            </div>
          </section>
        )}

        <section>
          <div className="flex justify-between mb-2 px-1">
            <h2 className="text-base font-black text-gray-800">Recommended for You</h2>
            <Link href="/customer/shop" className="text-xs font-bold text-blue-600">View All ›</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 pb-3">
            {topProducts.map((prod) => {
              const ph = getPhotos(prod);
              const cur = slides[prod.id] || 0;
              return (
                <div key={prod.id} className="w-full bg-white rounded-2xl border border-gray-100 p-2.5 flex flex-col justify-between">
                  <div>
                    <div className="h-28 bg-gray-50 rounded-xl mb-2 relative overflow-hidden">
                      {ph.length > 0 ? (
                        <>
                          <div onScroll={(e) => { const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth); if (idx !== cur) setSlides((p) => ({ ...p, [prod.id]: idx })); }} className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
                            {ph.map((src, i) => <img key={i} src={src} alt={prod.name} onClick={() => openZoom(ph, i, prod.name)} className="w-full h-full object-cover shrink-0 snap-center cursor-zoom-in" />)}
                          </div>
                          {ph.length > 1 && <span className="absolute top-1 right-1 bg-black/65 text-white text-[9px] px-1.5 rounded-full">{cur + 1}/{ph.length}</span>}
                        </>
                      ) : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-300">{prod.name.charAt(0)}</div>}
                    </div>
                    <h4 className="font-bold text-gray-800 text-xs line-clamp-1">{prod.name}</h4>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-black">₹{prod.selling_price}</span>
                    <Link href="/customer/shop" className="bg-blue-50 text-blue-600 text-[11px] font-bold px-2.5 py-1 rounded-lg">Add</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {zoomData && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4">
            <div className="flex justify-between items-center text-white">
              <span className="text-xs font-bold">{zoomData.title} ({zoomData.index + 1}/{zoomData.images.length})</span>
              <div className="flex gap-2">
                <button onClick={() => setZoomScale((s) => Math.max(1, s - 0.5))} className="w-8 h-8 rounded-full bg-white/20 font-bold">-</button>
                <button onClick={() => setZoomScale((s) => Math.min(3, s + 0.5))} className="w-8 h-8 rounded-full bg-white/20 font-bold">+</button>
                <button onClick={() => setZoomData(null)} className="w-8 h-8 rounded-full bg-red-600 font-bold">✕</button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto relative">
              <img src={zoomData.images[zoomData.index]} alt={zoomData.title} onClick={() => setZoomScale((s) => (s === 1 ? 2 : 1))} style={{ transform: `scale(${zoomScale})`, transition: "0.2s" }} className="max-h-[75vh] max-w-full object-contain rounded-xl" />
              {zoomData.images.length > 1 && (
                <>
                  <button onClick={() => { setZoomScale(1); setZoomData({ ...zoomData, index: (zoomData.index - 1 + zoomData.images.length) % zoomData.images.length }); }} className="absolute left-2 bg-white/20 text-white w-9 h-9 rounded-full font-bold">‹</button>
                  <button onClick={() => { setZoomScale(1); setZoomData({ ...zoomData, index: (zoomData.index + 1) % zoomData.images.length }); }} className="absolute right-2 bg-white/20 text-white w-9 h-9 rounded-full font-bold">›</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

  </main>
);
}
