'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

// --- TYPES ---
type Service = {
  id: string;
  name: string;
  price: number;
  description: string;
  is_active: boolean;
};

type Booking = {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string;
  service_id: string;
};

export default function ServiceProviderDashboard() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  // --- STATES ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'services'>('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- ADD SERVICE MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', description: '' });

  // --- FETCH DATA ---
  const fetchData = async () => {
    if (!activeId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId);
    if (servData) setServices(servData);

    const { data: bookData } = await supabase.from('service_bookings').select('*').eq('provider_business_id', activeId).order('created_at', { ascending: false });
    if (bookData) setBookings(bookData as any);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeId]);

  // --- SAVE NEW SERVICE ---
  const handleSaveService = async () => {
    if (!newService.name || !newService.price) return alert("Name & Price required");
    
    const { error } = await supabase.from('services').insert([{
      business_id: activeId,
      name: newService.name,
      price: Number(newService.price),
      description: newService.description
    }]);

    if (!error) {
      setIsModalOpen(false);
      setNewService({ name: '', price: '', description: '' });
      fetchData(); 
    } else {
      alert("Error adding service: " + error.message);
    }
  };

  // --- UPDATE BOOKING STATUS ---
  const handleUpdateBooking = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase.from('service_bookings').update({ status: newStatus }).eq('id', bookingId);
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    }
  };

  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? { name: service.name, price: service.price } : { name: 'Unknown Service', price: 0 };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-semibold text-blue-600">Loading Dashboard...</p>
      </div>
    );
  }

  // Calculated Stats
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const totalEarnings = bookings.filter(b => b.status === 'completed').reduce((acc, curr) => acc + getServiceDetails(curr.service_id).price, 0);

  return (
    <div className="flex h-screen bg-[#F8F9FB] font-sans overflow-hidden">
      
      {/* ================= SIDEBAR (Desktop) ================= */}
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
              <button onClick={() => {setActiveTab('services'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'services' ? 'bg-blue-600 text-white border-r-4 border-white' : 'text-gray-300 hover:bg-white/5'}`}>
                <span>🛠️</span> My Services
              </button>
            </li>
            <li className="px-6 py-4 mt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Coming Soon</li>
            <li><button className="w-full flex items-center gap-3 px-6 py-3 text-sm text-gray-500 cursor-not-allowed"><span>💰</span> Earnings</button></li>
            <li><button className="w-full flex items-center gap-3 px-6 py-3 text-sm text-gray-500 cursor-not-allowed"><span>👥</span> Team</button></li>
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/owner" className="block w-full text-center bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-semibold transition">← Main Panel</Link>
        </div>
      </aside>

      {/* Overlay for Mobile Menu */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

      {/* ================= MAIN CONTENT ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-600 text-2xl">☰</button>
            <h1 className="text-lg font-bold text-gray-800 hidden md:block">Service Provider Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-gray-700">Online</span>
            </div>
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">RS</div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* ================= DASHBOARD TAB ================= */}
            {activeTab === 'dashboard' && (
              <>
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-lg relative overflow-hidden">
                  <div className="relative z-10 mb-6 md:mb-0">
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome Back, Provider! 👋</h2>
                    <p className="text-blue-200 mb-4 max-w-md">Apka kaam, hamari zimmedari. Zyada bookings, zyada business – VyapaarSetu ke saath.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setActiveTab('bookings')} className="bg-blue-500 hover:bg-blue-600 px-5 py-2.5 rounded-lg font-bold text-sm transition">View Bookings</button>
                      <button onClick={() => setActiveTab('services')} className="bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg font-bold text-sm transition">Manage Services</button>
                    </div>
                  </div>
                  <div className="text-6xl relative z-10 hidden md:block">🛠️</div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">📦</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold mb-1">Total Bookings</p>
                      <h3 className="text-2xl font-bold text-gray-800">{totalBookings}</h3>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center text-xl">⏳</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold mb-1">Pending</p>
                      <h3 className="text-2xl font-bold text-gray-800">{pendingBookings}</h3>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl">✅</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold mb-1">Completed</p>
                      <h3 className="text-2xl font-bold text-gray-800">{completedBookings}</h3>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl">💰</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold mb-1">Earnings</p>
                      <h3 className="text-2xl font-bold text-gray-800">₹{totalEarnings}</h3>
                    </div>
                  </div>
                </div>

                {/* Placeholder for Recent Orders (Future Phase) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">Recent Orders</h3>
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Charts & Detailed Tables coming in the next update.</p>
                  </div>
                </div>
              </>
            )}

            {/* ================= BOOKINGS TAB (Old Logic Integrated) ================= */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">All Bookings</h2>
                {bookings.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">Abhi tak koi booking nahi aayi.</p>
                  </div>
                ) : (
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
                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                              booking.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>{booking.status}</span>
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

            {/* ================= SERVICES TAB (Old Logic Integrated) ================= */}
            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">My Services</h2>
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md">+ Add Service</button>
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

      {/* ================= ADD SERVICE MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Add New Service</h2>
            <input type="text" placeholder="Service Name" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full p-3 border rounded-xl" />
            <input type="number" placeholder="Price (₹)" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="w-full p-3 border rounded-xl" />
            <textarea placeholder="Description" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full p-3 border rounded-xl" rows={3}></textarea>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleSaveService} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white">Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}