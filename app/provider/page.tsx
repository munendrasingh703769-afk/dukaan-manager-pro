'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Service = { id: string; name: string; price: number; description: string; is_active: boolean; }
type Booking = { id: string; customer_name: string; customer_phone: string; booking_date: string; booking_time: string; status: string; notes: string; service_id: string; provider_business_id: string; }
type Quotation = { id: string; customer_name: string; customer_phone: string; requirement: string; details: string; status: string; quoted_amount: number; provider_reply: string; }

export default function ServiceProviderDashboard() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'services' | 'quotations'>('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', description: '' });

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [quoteForm, setQuoteForm] = useState({ amount: '', reply: '' });

  // --- FETCH DATA ---
  const fetchData = async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true);

    const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId);
    if (servData) setServices(servData);

    // Yahan Booking Fetch ho rahi hai
    const { data: bookData } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('provider_business_id', activeId)
      .order('created_at', { ascending: false });
    if (bookData) setBookings(bookData as any);

    const { data: quoteData } = await supabase.from('quotations').select('*').order('created_at', { ascending: false });
    if (quoteData) setQuotations(quoteData as any);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- SAVE SERVICE ---
  const handleSaveService = async () => {
    if (!newService.name || !newService.price) return alert("Name & Price required");
    const { error } = await supabase.from('services').insert([{ business_id: activeId, name: newService.name, price: Number(newService.price), description: newService.description }]);
    if (!error) { setIsServiceModalOpen(false); setNewService({ name: '', price: '', description: '' }); fetchData(); } 
    else alert("Error: " + error.message);
  };

  // --- UPDATE BOOKING ---
  const handleUpdateBooking = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase.from('service_bookings').update({ status: newStatus }).eq('id', bookingId);
    if (!error) setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
  };

  // --- SEND QUOTATION ---
  const handleSendQuote = async () => {
    if (!quoteForm.amount || !selectedQuotation) return alert("Please enter amount");
    const { error } = await supabase.from('quotations').update({
      quoted_amount: Number(quoteForm.amount),
      provider_reply: quoteForm.reply,
      provider_business_id: activeId,
      status: 'quoted'
    }).eq('id', selectedQuotation.id);

    if (!error) {
      alert("Quotation Sent Successfully!");
      setIsQuoteModalOpen(false);
      setQuoteForm({ amount: '', reply: '' });
      fetchData();
    } else alert("Error sending quote: " + error.message);
  };

  // --- DEBUG TEST FUNCTION ---
  const handleDebugCheck = async () => {
    const { data, error } = await supabase.from('service_bookings').select('*');
    if (error) return alert("DB Error: " + error.message);
    if (data && data.length > 0) {
      alert(`Database me Total ${data.length} booking(s) hain.\n\nAapki Current ID: ${activeId}\nPehli Booking ki ID: ${data[0].provider_business_id}\n\nAgar dono ID alag hain, toh isi wajah se booking nahi dikh rahi.`);
    } else {
      alert("Database me ek bhi booking nahi hai! Customer side se booking save nahi hui hai.");
    }
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
            <li>
              <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}>
                <span>🏠</span> Dashboard
              </button>
            </li>
            <li>
              <button onClick={() => {setActiveTab('bookings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition ${activeTab === 'bookings' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}>
                <div className="flex items-center gap-3"><span>📅</span> Bookings</div>
                {pendingBookings > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingBookings}</span>}
              </button>
            </li>
            <li>
              <button onClick={() => {setActiveTab('quotations'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition ${activeTab === 'quotations' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}>
                <div className="flex items-center gap-3"><span>📄</span> Quotations</div>
                {pendingQuotations > 0 && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingQuotations}</span>}
              </button>
            </li>
            <li>
              <button onClick={() => {setActiveTab('services'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'services' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}>
                <span>🛠️</span> My Services
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/owner" className="block w-full text-center bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-semibold transition">← Main Panel</Link>
        </div>
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
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-gray-700">Online</span>
            </div>
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">P</div>
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

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-3">📦</div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">Bookings</p>
                    <h3 className="text-2xl font-bold text-gray-800">{bookings.length}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center text-xl mb-3">⏳</div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">Pending</p>
                    <h3 className="text-2xl font-bold text-gray-800">{pendingBookings}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl mb-3">📄</div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">New Quotes</p>
                    <h3 className="text-2xl font-bold text-gray-800">{pendingQuotations}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
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
                
                {/* DEBUG BUTTON YAHAN HAI */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-yellow-800">Order nahi aa raha?</h3>
                    <p className="text-xs text-yellow-700">Yahan click karke check karein ki Database me data hai ya nahi.</p>
                  </div>
                  <button onClick={handleDebugCheck} className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md">Run Debug Test</button>
                </div>

                <h2 className="text-xl font-bold text-gray-800 mb-4">All Bookings</h2>
                {bookings.length === 0 ? <p className="text-gray-500 bg-white p-6 rounded-xl text-center">No bookings found.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookings.map((booking) => {
                      const serviceDetails = getServiceDetails(booking.service_id);
                      return (
                        <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-lg text-gray-800">{serviceDetails.name}</h3>
                              <p className="text-sm text-purple-600 font-bold">₹{serviceDetails.price}</p>
                            </div>
                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : booking.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{booking.status}</span>
                          </div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            <p><b>Name:</b> {booking.customer_name}</p>
                            <p><b>Phone:</b> {booking.customer_phone}</p>
                            <p><b>Date:</b> {booking.booking_date} | {booking.booking_time}</p>
                          </div>
                          {booking.status === 'pending' && (
                            <div className="flex gap-2 pt-2">
                              <button onClick={() => handleUpdateBooking(booking.id, 'rejected')} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-semibold text-sm">Reject</button>
                              <button onClick={() => handleUpdateBooking(booking.id, 'accepted')} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold text-sm">Accept</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* QUOTATIONS TAB */}
            {activeTab === 'quotations' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Quotation Requests</h2>
                {quotations.length === 0 ? <p className="text-gray-500 bg-white p-6 rounded-xl text-center">Koi quotation request nahi aayi hai.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quotations.map((q) => (
                      <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">{q.requirement}</h3>
                            <p className="text-sm text-gray-500">{q.details}</p>
                          </div>
                          <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${q.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{q.status}</span>
                        </div>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <p><b>Name:</b> {q.customer_name}</p>
                          <p><b>Phone:</b> {q.customer_phone}</p>
                        </div>
                        {q.status === 'pending' ? (
                          <button onClick={() => { setSelectedQuotation(q); setIsQuoteModalOpen(true); }} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm shadow-md hover:bg-orange-600">Send Quotation</button>
                        ) : (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <p className="text-xs text-green-700 font-bold mb-1">You quoted: ₹{q.quoted_amount}</p>
                            <p className="text-xs text-green-600">Msg: {q.provider_reply}</p>
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

      {/* MODALS */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Add New Service</h2>
            <input type="text" placeholder="Service Name" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full p-3 border rounded-xl" />
            <input type="number" placeholder="Price (₹)" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="w-full p-3 border rounded-xl" />
            <textarea placeholder="Description" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full p-3 border rounded-xl" rows={3}></textarea>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsServiceModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleSaveService} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {isQuoteModalOpen && selectedQuotation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Send Quotation</h2>
            <p className="text-sm text-gray-500">Requirement: <b>{selectedQuotation.requirement}</b></p>
            <div>
              <label className="text-sm font-bold text-gray-700">Your Price (₹) *</label>
              <input type="number" placeholder="e.g. 500" value={quoteForm.amount} onChange={e => setQuoteForm({...quoteForm, amount: e.target.value})} className="w-full p-3 border rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Message / Terms</label>
              <textarea placeholder="e.g. Visit charge included." value={quoteForm.reply} onChange={e => setQuoteForm({...quoteForm, reply: e.target.value})} className="w-full p-3 border rounded-xl mt-1" rows={3}></textarea>
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