'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

// --- TYPES ---
type Service = { id: string; name: string; price: number; description: string; is_active: boolean; }
type Booking = { id: string; customer_name: string; customer_phone: string; booking_date: string; booking_time: string; status: string; notes: string; service_id: string; }
type Quotation = { id: string; customer_name: string; customer_phone: string; requirement: string; details: string; status: string; quoted_amount: number; labour_charge: number; items: any[]; provider_reply: string; }
type Review = { id: string; customer_name: string; rating: number; review_text: string; created_at: string; }

export default function ServiceProviderDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  // --- STATES ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'services' | 'quotations' | 'profile' | 'reviews'>('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Profile & Online Status
  const [isOnline, setIsOnline] = useState(true);
  const [profileData, setProfileData] = useState({ owner_name: '', phone: '', address: '' });

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', description: '' });
  
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [quoteForm, setQuoteForm] = useState({ 
    labour_charge: '', reply: '', 
    items: [{ name: '', qty: 1, price: 0, gst: 0 }] // Dynamic Items
  });

  // --- FETCH DATA ---
  const fetchData = async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true);

    // Fetch Business Profile
    const { data: bizData } = await supabase.from('businesses').select('*').eq('id', activeId).single();
    if (bizData) {
      setIsOnline(bizData.is_online ?? true);
      setProfileData({ owner_name: bizData.owner_name || '', phone: bizData.phone || '', address: bizData.address || '' });
    }

    const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId);
    if (servData) setServices(servData);

    const { data: bookData } = await supabase.from('service_bookings').select('*').eq('provider_business_id', activeId).order('created_at', { ascending: false });
    if (bookData) setBookings(bookData as any);

    const { data: quoteData } = await supabase.from('quotations').select('*').order('created_at', { ascending: false });
    if (quoteData) setQuotations(quoteData as any);

    const { data: revData } = await supabase.from('reviews').select('*').eq('provider_business_id', activeId).order('created_at', { ascending: false });
    if (revData) setReviews(revData as any);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- HANDLE ONLINE/OFFLINE ---
  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await supabase.from('businesses').update({ is_online: newStatus }).eq('id', activeId);
  };

  // --- SAVE PROFILE ---
  const handleSaveProfile = async () => {
    const { error } = await supabase.from('businesses').update(profileData).eq('id', activeId);
    if (!error) alert("Profile Updated Successfully!");
    else alert("Error updating profile");
  };

  // --- LOGOUT ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- ADD/REMOVE QUOTATION ITEMS ---
  const handleAddQuoteItem = () => setQuoteForm({ ...quoteForm, items: [...quoteForm.items, { name: '', qty: 1, price: 0, gst: 0 }] });
  const handleRemoveQuoteItem = (index: number) => {
    const newItems = quoteForm.items.filter((_, i) => i !== index);
    setQuoteForm({ ...quoteForm, items: newItems });
  };
  const handleUpdateQuoteItem = (index: number, field: string, value: any) => {
    const newItems = [...quoteForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuoteForm({ ...quoteForm, items: newItems });
  };

  // --- SEND QUOTATION ---
  const handleSendQuote = async () => {
    if (!selectedQuotation) return;
    
    // Calculate Total
    let total = Number(quoteForm.labour_charge || 0);
    quoteForm.items.forEach(item => {
      const itemTotal = (item.qty * item.price);
      const gstAmount = item.gst > 0 ? (itemTotal * (item.gst / 100)) : 0;
      total += itemTotal + gstAmount;
    });

    const { error } = await supabase.from('quotations').update({
      quoted_amount: total,
      provider_reply: quoteForm.reply,
      labour_charge: Number(quoteForm.labour_charge || 0),
      items: quoteForm.items,
      provider_business_id: activeId,
      status: 'quoted'
    }).eq('id', selectedQuotation.id);

    if (!error) {
      alert("Quotation Sent Successfully!");
      setIsQuoteModalOpen(false);
      setQuoteForm({ labour_charge: '', reply: '', items: [{ name: '', qty: 1, price: 0, gst: 0 }] });
      fetchData();
    } else alert("Error sending quote: " + error.message);
  };

  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? { name: service.name, price: service.price } : { name: 'Unknown', price: 0 };
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><p className="font-semibold text-blue-600">Loading Dashboard...</p></div>;

  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const totalEarnings = bookings.filter(b => b.status === 'completed').reduce((acc, curr) => acc + getServiceDetails(curr.service_id).price, 0);
  const pendingQuotations = quotations.filter(q => q.status === 'pending').length;
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
            <li><button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}><span>🏠</span> Dashboard</button></li>
            <li><button onClick={() => {setActiveTab('bookings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition ${activeTab === 'bookings' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}><div className="flex items-center gap-3"><span>📅</span> Bookings</div>{pendingBookings > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingBookings}</span>}</button></li>
            <li><button onClick={() => {setActiveTab('quotations'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition ${activeTab === 'quotations' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}><div className="flex items-center gap-3"><span>📄</span> Quotations</div>{pendingQuotations > 0 && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingQuotations}</span>}</button></li>
            <li><button onClick={() => {setActiveTab('reviews'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'reviews' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}><span>⭐</span> Reviews</button></li>
            
            <li className="px-6 py-2 mt-2 text-xs font-bold text-gray-500 uppercase">Management</li>
            <li><button onClick={() => {setActiveTab('services'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'services' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}><span>🛠️</span> My Services</button></li>
            
            {/* Inventory Links */}
            <li><Link href="/products" className="w-full flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/5"><span>📦</span> Products</Link></li>
            <li><Link href="/purchases" className="w-full flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/5"><span>🛒</span> Purchases</Link></li>
            <li><Link href="/sales" className="w-full flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/5"><span>💰</span> Sales</Link></li>

            <li className="px-6 py-2 mt-2 text-xs font-bold text-gray-500 uppercase">Account</li>
            <li><button onClick={() => {setActiveTab('profile'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'profile' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}><span>👤</span> My Profile</button></li>
          </ul>
        </nav>
        <div className="p-4 border-t border-white/10"><Link href="/owner" className="block w-full text-center bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-semibold transition">← Main Panel</Link></div>
      </aside>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-600 text-2xl">☰</button>
            <h1 className="text-lg font-bold text-gray-800 hidden md:block">Provider Workspace</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* ONLINE/OFFLINE TOGGLE */}
            <button onClick={toggleOnlineStatus} className={`flex items-center gap-2 border px-3 py-1.5 rounded-full transition ${isOnline ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span className={`text-xs font-bold ${isOnline ? 'text-green-700' : 'text-gray-600'}`}>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">P</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <>
                <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-lg relative overflow-hidden">
                  <div className="relative z-10 mb-6 md:mb-0">
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome Back, Provider! 👋</h2>
                    <p className="text-blue-200 mb-4 max-w-md">Aapka business badhane ke liye hum hamesha taiyar hain.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setActiveTab('bookings')} className="bg-blue-500 hover:bg-blue-600 px-5 py-2.5 rounded-lg font-bold text-sm transition">View Bookings</button>
                      <button onClick={() => setActiveTab('quotations')} className="bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg font-bold text-sm transition">Check Quotes</button>
                    </div>
                  </div>
                  <div className="text-6xl relative z-10 hidden md:block">📈</div>
                </div>

                {/* CLICKABLE STATS CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div onClick={() => setActiveTab('bookings')} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-3">📦</div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">Bookings</p>
                    <h3 className="text-2xl font-bold text-gray-800">{bookings.length}</h3>
                  </div>
                  <div onClick={() => setActiveTab('bookings')} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition">
                    <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center text-xl mb-3">⏳</div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">Pending</p>
                    <h3 className="text-2xl font-bold text-gray-800">{pendingBookings}</h3>
                  </div>
                  <div onClick={() => setActiveTab('quotations')} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl mb-3">📄</div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">New Quotes</p>
                    <h3 className="text-2xl font-bold text-gray-800">{pendingQuotations}</h3>
                  </div>
                  <div onClick={() => setActiveTab('bookings')} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl mb-3">💰</div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">Earnings</p>
                    <h3 className="text-2xl font-bold text-gray-800">₹{totalEarnings}</h3>
                  </div>
                </div>
              </>
            )}
            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex justify-between items-center">
                  <div><h3 className="font-bold text-yellow-800">Order nahi aa raha?</h3><p className="text-xs text-yellow-700">Check karein ki Database me data hai ya nahi.</p></div>
                  <button onClick={async () => {
                    const { data } = await supabase.from('service_bookings').select('*');
                    alert(`DB me Total ${data?.length || 0} booking(s) hain.`);
                  }} className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-sm">Test</button>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">All Bookings</h2>
                {bookings.length === 0 ? <p className="text-gray-500 bg-white p-6 rounded-xl text-center">No bookings found.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookings.map((b) => {
                      const s = getServiceDetails(b.service_id);
                      return (
                        <div key={b.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                          <div className="flex justify-between items-start">
                            <div><h3 className="font-bold text-lg">{s.name}</h3><p className="text-sm text-purple-600 font-bold">₹{s.price}</p></div>
                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : b.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span>
                          </div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg"><p><b>Name:</b> {b.customer_name}</p><p><b>Phone:</b> {b.customer_phone}</p><p><b>Date:</b> {b.booking_date}</p></div>
                          {b.status === 'pending' && (
                            <div className="flex gap-2 pt-2">
                              <button onClick={async () => { await supabase.from('service_bookings').update({status: 'rejected'}).eq('id', b.id); fetchData(); }} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold text-sm">Reject</button>
                              <button onClick={async () => { await supabase.from('service_bookings').update({status: 'accepted'}).eq('id', b.id); fetchData(); }} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm">Accept</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
                  <div><label className="text-sm font-bold text-gray-700">Owner Name</label><input type="text" value={profileData.owner_name} onChange={e => setProfileData({...profileData, owner_name: e.target.value})} className="w-full p-3 border rounded-xl mt-1" /></div>
                  <div><label className="text-sm font-bold text-gray-700">Phone Number</label><input type="text" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full p-3 border rounded-xl mt-1" /></div>
                  <div><label className="text-sm font-bold text-gray-700">Business Address</label><textarea value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} className="w-full p-3 border rounded-xl mt-1" rows={2}></textarea></div>
                  <button onClick={handleSaveProfile} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Save Profile</button>
                  <hr className="my-4" />
                  <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold">Logout Account</button>
                </div>
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Customer Reviews</h2>
                {reviews.length === 0 ? <p className="text-gray-500 bg-white p-6 rounded-xl text-center">Abhi tak koi review nahi aaya.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-gray-800">{r.customer_name}</h3>
                          <div className="flex text-yellow-400 text-lg">{'⭐'.repeat(r.rating)}</div>
                        </div>
                        <p className="text-sm text-gray-600">{r.review_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUOTATIONS TAB */}
            {activeTab === 'quotations' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Quotation Requests</h2>
                {quotations.length === 0 ? <p className="text-gray-500 bg-white p-6 rounded-xl text-center">Koi request nahi aayi hai.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quotations.map((q) => (
                      <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                        <div className="flex justify-between items-start">
                          <div><h3 className="font-bold text-lg">{q.requirement}</h3><p className="text-sm text-gray-500">{q.details}</p></div>
                          <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${q.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{q.status}</span>
                        </div>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg"><p><b>Name:</b> {q.customer_name}</p><p><b>Phone:</b> {q.customer_phone}</p></div>
                        {q.status === 'pending' ? (
                          <button onClick={() => { setSelectedQuotation(q); setIsQuoteModalOpen(true); }} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm shadow-md hover:bg-orange-600">Send Quotation</button>
                        ) : (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <p className="text-xs text-green-700 font-bold mb-1">Total Quoted: ₹{q.quoted_amount}</p>
                            <p className="text-xs text-green-600">Labour: ₹{q.labour_charge} | Msg: {q.provider_reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SERVICES TAB */}
            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">My Services</h2>
                  <button onClick={() => setIsServiceModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md">+ Add Service</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <div key={service.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-lg text-gray-800">{service.name}</h3>
                      <p className="text-xl font-black text-purple-600 mt-1">₹{service.price}</p>
                      <p className="text-sm text-gray-500 mt-2">{service.description || 'No description'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ADD SERVICE MODAL */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Add New Service</h2>
            <input type="text" placeholder="Service Name" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full p-3 border rounded-xl" />
            <input type="number" placeholder="Price (₹)" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="w-full p-3 border rounded-xl" />
            <textarea placeholder="Description" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full p-3 border rounded-xl" rows={3}></textarea>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsServiceModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={async () => {
                if(!newService.name || !newService.price) return alert("Required");
                await supabase.from('services').insert([{ business_id: activeId, name: newService.name, price: Number(newService.price), description: newService.description }]);
                setIsServiceModalOpen(false); fetchData();
              }} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED QUOTATION MODAL */}
      {isQuoteModalOpen && selectedQuotation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800">Create Quotation</h2>
            
            {/* Items List */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Products / Services</label>
              {quoteForm.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
                  <input type="text" placeholder="Item Name" value={item.name} onChange={e => handleUpdateQuoteItem(idx, 'name', e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" />
                  <input type="number" placeholder="Qty" value={item.qty || ''} onChange={e => handleUpdateQuoteItem(idx, 'qty', Number(e.target.value))} className="w-16 p-2 border rounded-lg text-sm" />
                  <input type="number" placeholder="Price" value={item.price || ''} onChange={e => handleUpdateQuoteItem(idx, 'price', Number(e.target.value))} className="w-20 p-2 border rounded-lg text-sm" />
                  <select value={item.gst} onChange={e => handleUpdateQuoteItem(idx, 'gst', Number(e.target.value))} className="w-20 p-2 border rounded-lg text-sm bg-white">
                    <option value={0}>No GST</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                  <button onClick={() => handleRemoveQuoteItem(idx)} className="text-red-500 font-bold px-2">×</button>
                </div>
              ))}
              <button onClick={handleAddQuoteItem} className="text-sm font-bold text-blue-600">+ Add Item</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-gray-700">Labour Charge (₹)</label>
                <input type="number" placeholder="e.g. 200" value={quoteForm.labour_charge} onChange={e => setQuoteForm({...quoteForm, labour_charge: e.target.value})} className="w-full p-3 border rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">Message</label>
                <input type="text" placeholder="Terms..." value={quoteForm.reply} onChange={e => setQuoteForm({...quoteForm, reply: e.target.value})} className="w-full p-3 border rounded-xl mt-1" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsQuoteModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleSendQuote} className="flex-1 bg-orange-500 py-3 rounded-xl font-bold text-white">Send Quote</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}