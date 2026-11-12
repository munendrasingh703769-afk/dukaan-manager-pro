'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// 🌐 TRANSLATIONS DICTIONARY
const translations = {
  en: {
    appName: "VyapaarSetu",
    tagline: "Smart Shopping, Smart For You",
    searchPlaceholder: "Search for products...",
    heroTitle: "Shop from Home!",
    heroDesc: "Easily, without any hassle!",
    exploreBtn: "Explore Now →",
    shopNow: "Shop Now",
    exploreServices: "Explore Services",
    bookRide: "Book Ride",
    sendParcel: "Send Parcel",
    myOrders: "My Orders",
    myBookings: "My Bookings",
    myQuotes: "My Quotes",
    udhaar: "Udhaar (Credit)",
    shopByCat: "Shop by Category",
    viewAll: "View All",
    more: "More",
    specialDeals: "Special Deals",
    dealsDesc: "Save more on your favorite products",
    recommended: "Recommended for You",
    noProducts: "No products available right now.",
    add: "Add",
    bottomNavHome: "Home",
    bottomNavShop: "Shop",
    bottomNavServices: "Services",
    bottomNavRides: "Rides",
    bottomNavProfile: "Profile",
    notifications: "Notifications",
    noNotifs: "No new notifications.",
    close: "Close"
  },
  hi: {
    appName: "व्यापारसेतु",
    tagline: "स्मार्ट शॉपिंग, स्मार्ट आपके लिए",
    searchPlaceholder: "प्रोडक्ट्स खोजें...",
    heroTitle: "घर बैठे शॉपिंग करें!",
    heroDesc: "आसान तरीके से, बिना किसी परेशानी के!",
    exploreBtn: "अभी देखें →",
    shopNow: "अभी खरीदें",
    exploreServices: "सर्विसेज देखें",
    bookRide: "राइड बुक करें",
    sendParcel: "पार्सल भेजें",
    myOrders: "मेरे ऑर्डर्स",
    myBookings: "मेरी बुकिंग्स",
    myQuotes: "मेरे कोटेशन",
    udhaar: "उधार (क्रेडिट)",
    shopByCat: "कैटेगरी से खरीदें",
    viewAll: "सभी देखें",
    more: "और देखें",
    specialDeals: "स्पेशल डील्स",
    dealsDesc: "अपने पसंदीदा प्रोडक्ट्स पर और बचाएं",
    recommended: "आपके लिए सुझाए गए",
    noProducts: "अभी कोई प्रोडक्ट उपलब्ध नहीं है।",
    add: "जोड़ें",
    bottomNavHome: "होम",
    bottomNavShop: "शॉप",
    bottomNavServices: "सर्विसेज",
    bottomNavRides: "राइड्स",
    bottomNavProfile: "प्रोफाइल",
    notifications: "नोटिफिकेशन्स",
    noNotifs: "कोई नया नोटिफिकेशन नहीं है।",
    close: "बंद करें"
  }
}

export default function CustomerSuperAppHome() {
  const router = useRouter();
  const supabase = createClient();
  
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const t = translations[lang];

  const [categories, setCategories] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'hi' : 'en');
  };

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

      // 👇 Yahan humne image_urls bhi fetch kar liya hai
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
      
      <header className="bg-blue-600 text-white pt-4 pb-6 px-4 rounded-b-3xl relative shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 text-2xl font-black">🏪</div>
            <div>
              <h1 className="text-xl font-black leading-tight tracking-wide">{t.appName}</h1>
              <p className="text-blue-100 text-[11px] font-medium">{t.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleLanguage} className="bg-blue-700 text-white border border-blue-500 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
              {lang === 'en' ? 'हिंदी' : 'EN'}
            </button>
            <button onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAsRead(); }} className="relative p-1">
              <span className="text-3xl">🔔</span>
              {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-600"></span>}
            </button>
            <Link href="/customer/profile" className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
              {userProfile?.full_name ? userProfile.full_name.charAt(0) : 'M'}
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-xl flex items-center p-2 shadow-sm">
          <span className="text-gray-400 pl-2 text-xl">🔍</span>
          <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent outline-none text-sm px-3 text-gray-700 font-medium" />
          <button type="button" className="text-blue-600 text-2xl px-2">🎤</button>
          <button type="button" className="text-blue-600 text-2xl pr-2">📷</button>
        </form>
      </header>

      <div className="px-3 space-y-5 mt-4 max-w-2xl mx-auto">
        
        <section>
          <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl p-5 relative overflow-hidden flex items-center shadow-sm">
            <div className="relative z-10 w-3/5">
              <h2 className="text-xl font-black text-blue-900 leading-tight">{t.heroTitle}</h2>
              <p className="text-sm text-blue-800 font-medium mt-1">{t.heroDesc}</p>
              <Link href="/customer/explore" className="bg-blue-900 text-white text-xs font-bold px-5 py-2.5 rounded-lg mt-3 shadow-md flex items-center gap-1 w-max">{t.exploreBtn}</Link>
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] text-7xl opacity-90">🛍️</div>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-4 gap-y-5 gap-x-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <Link href="/customer/shop" className="flex flex-col items-center gap-2 active:scale-95 transition">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">🛒</div>
              <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{t.shopNow}</span>
            </Link>
            
            <Link href="/customer/explore" className="flex flex-col items-center gap-2 active:scale-95 transition">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">🧭</div>
              <span className="text-[11px] font-bold text-indigo-700 text-center leading-tight">{t.exploreServices}</span>
            </Link>

            <Link href="/customer/rides" className="flex flex-col items-center gap-2 active:scale-95 transition">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">🏍️</div>
              <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{t.bookRide}</span>
            </Link>
            
            <Link href="/customer/rides?type=parcel" className="flex flex-col items-center gap-2 active:scale-95 transition">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">📦</div>
              <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{t.sendParcel}</span>
            </Link>

            <Link href="/customer/orders" className="flex flex-col items-center gap-2 active:scale-95 transition">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">🕒</div>
              <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{t.myOrders}</span>
            </Link>
            
            <Link href="/customer/bookings" className="flex flex-col items-center gap-2 active:scale-95 transition">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">📅</div>
              <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{t.myBookings}</span>
            </Link>
            
            <Link href="/customer/quotations" className="flex flex-col items-center gap-2 active:scale-95 transition">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">📄</div>
              <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{t.myQuotes}</span>
            </Link>

            <Link href="/customer/orders" className="flex flex-col items-center gap-2 active:scale-95 transition">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">💰</div>
              <span className="text-[11px] font-bold text-green-700 text-center leading-tight">{t.udhaar}</span>
            </Link>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><span className="w-1.5 h-5 bg-blue-600 rounded-full"></span> {t.shopByCat}</h2>
            <Link href="/customer/shop" className="text-xs font-bold text-blue-600">{t.viewAll} ›</Link>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link href={`/customer/shop?cat=${cat.name}`} key={cat.id} className="bg-white p-3 rounded-2xl text-center shadow-sm border border-gray-100 hover:border-blue-200 transition">
                <div className="w-14 h-14 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-2">{cat.icon || '📦'}</div>
                <p className="text-[11px] font-bold text-gray-700 truncate">{cat.name}</p>
              </Link>
            ))}
             <Link href="/customer/shop" className="bg-white p-3 rounded-2xl text-center shadow-sm border border-gray-100 hover:border-blue-200 transition">
                <div className="w-14 h-14 mx-auto bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl font-black mb-2">•••</div>
                <p className="text-[11px] font-bold text-blue-700 truncate">{t.more}</p>
              </Link>
          </div>
        </section>

        <section>
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-5 flex items-center justify-between border border-purple-200 shadow-sm">
            <div>
              <h3 className="text-purple-900 font-black text-lg flex items-center gap-1">🏷️ {t.specialDeals}</h3>
              <p className="text-purple-700 text-xs font-medium mt-1">{t.dealsDesc}</p>
            </div>
            <Link href="/customer/shop" className="bg-purple-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-md">{t.shopNow} →</Link>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><span className="w-1.5 h-5 bg-blue-600 rounded-full"></span> {t.recommended}</h2>
            <Link href="/customer/shop" className="text-xs font-bold text-blue-600">{t.viewAll} ›</Link>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-500 w-full text-center py-4 bg-white rounded-xl">{t.noProducts}</p>
            ) : (
              topProducts.map(prod => {
                const discount = prod.mrp && prod.mrp > prod.selling_price 
                  ? Math.round(((prod.mrp - prod.selling_price) / prod.mrp) * 100) 
                  : 0;
                
                // 👇 IMAGE FIX LOGIC HERE
                const coverImage = prod.image_urls && prod.image_urls.length > 0 ? prod.image_urls[0] : null;

                return (
                  <div key={prod.id} className="min-w-[150px] w-[150px] bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between">
                    <div>
                      <div className="h-28 bg-gray-50 rounded-xl mb-2 flex items-center justify-center overflow-hidden relative">
                        {/* 👇 Yahan image check lagaya hai */}
                        {coverImage ? (
                          <img src={coverImage} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl text-gray-300 font-black">{prod.name.charAt(0)}</span>
                        )}

                        {discount > 0 && (
                          <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
                            {discount}% OFF
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight">{prod.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{prod.businesses?.name}</p>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex items-center gap-1">
                        <p className="text-base font-black text-gray-900">₹{prod.selling_price}</p>
                        {prod.mrp && prod.mrp > prod.selling_price && (
                          <p className="text-xs text-gray-400 line-through">₹{prod.mrp}</p>
                        )}
                      </div>
                      <Link href="/customer/shop" className="mt-2 w-full bg-blue-50 text-blue-700 font-bold text-sm py-2 rounded-xl flex items-center justify-center border border-blue-100">
                        {t.add}
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

      </div>

      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <Link href="/customer" className="flex flex-col items-center gap-1 text-blue-600">
          <span className="text-2xl">🏠</span>
          <span className="text-[11px] font-bold">{t.bottomNavHome}</span>
        </Link>
        <Link href="/customer/shop" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600">
          <span className="text-2xl">🛍️</span>
          <span className="text-[11px] font-medium">{t.bottomNavShop}</span>
        </Link>
        
        <div className="relative -top-6">
          <Link href="/customer/explore" className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl shadow-lg border-4 border-white">
            🧭
          </Link>
        </div>

        <Link href="/customer/my-rides" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 relative">
          <span className="text-2xl">🏍️</span>
          <span className="text-[11px] font-medium">{t.bottomNavRides}</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600">
          <span className="text-2xl">👤</span>
          <span className="text-[11px] font-medium">{t.bottomNavProfile}</span>
        </Link>
      </nav>

      {showNotifications && (
        <div className="absolute top-20 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-100 z-[999] max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0">
            <h3 className="font-bold text-sm text-gray-800">{t.notifications}</h3>
            <button onClick={() => setShowNotifications(false)} className="text-xs font-bold text-blue-600">{t.close}</button>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500">{t.noNotifs}</p>
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