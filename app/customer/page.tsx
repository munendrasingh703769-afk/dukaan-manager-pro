'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerSuperAppHome() {
  const router = useRouter();
  const supabase = createClient();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  
  // 🔍 Search State
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ requirement: '', details: '', phone: '', name: '' });

  useEffect(() => {
    const fetchData = async () => {
      const { data: catData } = await supabase.from('service_categories').select('*').eq('is_active', true).limit(8);
      if (catData) setCategories(catData);

      const { data: servData } = await supabase.from('services').select(`*, businesses!inner(name, city)`).eq('is_active', true).limit(5);
      if (servData) setTopServices(servData);

      const { data: prodData } = await supabase.from('products').select(`*, businesses!inner(name, city)`).gt('stock', 0).limit(5);
      if (prodData) setTopProducts(prodData);
    };
    fetchData();
  }, [supabase]);

  useEffect(() => {
    const fetchCustomerNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };
    fetchCustomerNotifications();
    const interval = setInterval(fetchCustomerNotifications, 10000);
    return () => clearInterval(interval);
  }, [supabase]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('customer_id', user.id).eq('is_read', false);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 👇 Search Submit Function
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeSearchQuery.trim()) {
      router.push(`/customer/explore?search=${homeSearchQuery}`);
    } else {
      router.push('/customer/explore');
    }
  };

  const handleRequestQuotation = async () => {
    if (!quoteForm.requirement || !quoteForm.phone) return alert("Please fill requirement and phone number");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('quotations').insert([{
      customer_name: quoteForm.name || "Customer",
      customer_phone: quoteForm.phone,
      requirement: quoteForm.requirement,
      details: quoteForm.details,
      status: 'pending',
      customer_id: user?.id || null 
    }]);
    
    if (!error) {
      alert("Request Sent!");
      setIsQuoteModalOpen(false);
      setQuoteForm({ requirement: '', details: '', phone: '', name: '' });
    } else alert(error.message);
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] pb-24 font-sans">
      {/* 🟣 Premium Header 🟣 */}
      <header className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-b-[2.5rem] px-6 pt-12 pb-16 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white text-xl font-bold border border-white/30 shadow-inner">V</div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">VyapaarSetu</h1>
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">Super App</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAsRead(); }} className="relative p-2 bg-white/10 rounded-full hover:bg-white/20 transition border border-white/20">
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
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
            </div>
            <button onClick={handleLogout} className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition">Logout</button>
          </div>
        </div>
        
        <div className="relative z-10 mb-4">
          <p className="text-blue-100 text-xs font-bold mb-1 flex items-center gap-1">📍 Deliver to: <span className="text-white">Current Location</span></p>
          <h2 className="text-2xl font-black text-white leading-tight">Namaste,<br/>Aaj kya khareedna hai?</h2>
        </div>
      </header>

      <div className="px-4 space-y-6 max-w-2xl mx-auto -mt-8 relative z-20">
        
        {/* 🔍 WORKING SEARCH BAR */}
        <form onSubmit={handleSearchSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center p-2 w-full">
          <span className="text-gray-400 pl-3">🔍</span>
          <input 
            type="text" 
            placeholder="Search shops, products, services..." 
            value={homeSearchQuery}
            onChange={(e) => setHomeSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm p-3 text-gray-700 font-medium" 
          />
          <button type="submit" className="bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-xl text-sm">Search</button>
        </form>

        {/* ⚡ Quick Actions */}
        <section>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <Link href="/customer/shop" className="min-w-[80px] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl">🛒</div>
              <span className="text-[11px] font-bold text-gray-700 text-center whitespace-nowrap">Shop Now</span>
            </Link>
            <Link href="/customer/explore" className="min-w-[80px] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl">🛠️</div>
              <span className="text-[11px] font-bold text-gray-700 text-center whitespace-nowrap">Services</span>
            </Link>
            <Link href="/customer/rides" className="min-w-[80px] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-2xl">🏍️</div>
              <span className="text-[11px] font-bold text-gray-700 text-center whitespace-nowrap">Book Ride</span>
            </Link>
            <Link href="/customer/rides?type=parcel" className="min-w-[80px] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center text-2xl">📦</div>
              <span className="text-[11px] font-bold text-gray-700 text-center whitespace-nowrap">Send Parcel</span>
            </Link>
          </div>
        </section>

        {/* 🚀 Promotional Banner */}
        <section className="my-2">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 flex items-center justify-between shadow-lg">
             <div>
                <h3 className="text-white font-black text-lg">Flat 20% OFF</h3>
                <p className="text-pink-100 text-xs font-medium mt-1">On your first service booking!</p>
                <button className="bg-white text-pink-600 text-xs font-bold px-4 py-1.5 rounded-full mt-3 shadow-md">Claim Now</button>
             </div>
             <div className="text-5xl opacity-80">🎁</div>
          </div>
        </section>

        {/* 📝 My Estimate Requests */}
        <div onClick={() => setIsQuoteModalOpen(true)} className="bg-gradient-to-r from-orange-400 to-yellow-500 rounded-2xl p-4 shadow-lg flex items-center justify-between relative overflow-hidden cursor-pointer active:scale-95 transition">
          <div className="absolute right-0 top-0 text-6xl opacity-20">📄</div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-xl border border-white/30">📝</div>
            <div>
              <p className="text-white font-bold text-sm">Need a Custom Quote?</p>
              <p className="text-orange-50 text-[10px] mt-0.5">Request estimates from local providers</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">→</div>
        </div>

        {/* 📦 Categories (With Specific Links) */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold text-gray-800">Explore Categories</h2>
            <Link href="/customer/explore" className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">See All</Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat) => (
              // 👇 Yahan ?cat=id add kiya hai
              <Link href={`/customer/explore?cat=${cat.id}`} key={cat.id} className="bg-white p-2 rounded-2xl text-center shadow-sm border border-gray-100 hover:border-indigo-200 transition">
                <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-2">{cat.icon}</div>
                <p className="text-[10px] font-bold text-gray-700 truncate">{cat.name}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 🛠️ Top Services */}
        {topServices.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-bold text-gray-800">Top Services Near You</h2>
              <Link href="/customer/explore" className="text-xs font-bold text-indigo-600">View All</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {topServices.map(service => (
                <Link href="/customer/explore" key={service.id} className="min-w-[200px] bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{service.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{service.businesses?.name}</p>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                    <p className="text-indigo-600 font-black">₹{service.price}</p>
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-md">Book</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 🛒 Shop Essentials */}
        {topProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-bold text-gray-800">Shop Essentials</h2>
              <Link href="/customer/shop" className="text-xs font-bold text-indigo-600">View All</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {topProducts.map(prod => (
                <Link href="/customer/shop" key={prod.id} className="min-w-[140px] bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between">
                   <div className="h-20 bg-gray-50 rounded-xl mb-2 flex items-center justify-center text-xl text-gray-400">
                     {prod.name.charAt(0)}
                   </div>
                   <div>
                     <h4 className="font-bold text-gray-800 text-xs line-clamp-2">{prod.name}</h4>
                     <p className="text-indigo-600 font-black mt-1">₹{prod.selling_price}</p>
                   </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* 📱 Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-3 pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <Link href="/customer" className="flex flex-col items-center gap-1 text-indigo-600">
          <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">🏠</div>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/customer/shop" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600">
          <span className="text-xl">🛒</span>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        <Link href="/customer/explore" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600">
          <span className="text-xl">🛠️</span>
          <span className="text-[10px] font-medium">Services</span>
        </Link>
        <Link href="/customer/rides" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600">
          <span className="text-xl">🏍️</span>
          <span className="text-[10px] font-medium">Rides</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>

      {/* QUOTATION MODAL */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Request Quotation</h2>
            <input type="text" placeholder="Kya chahiye? (e.g. AC Repair) *" value={quoteForm.requirement} onChange={e => setQuoteForm({...quoteForm, requirement: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" />
            <textarea placeholder="Details (Optional)" value={quoteForm.details} onChange={e => setQuoteForm({...quoteForm, details: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" rows={2}></textarea>
            <input type="text" placeholder="Your Name" value={quoteForm.name} onChange={e => setQuoteForm({...quoteForm, name: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" />
            <input type="tel" placeholder="Phone Number *" value={quoteForm.phone} onChange={e => setQuoteForm({...quoteForm, phone: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsQuoteModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleRequestQuotation} className="flex-1 bg-orange-500 py-3 rounded-xl font-bold text-white">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}