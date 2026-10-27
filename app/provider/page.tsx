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
  const [activeTab, setActiveTab] = useState<'bookings' | 'services'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

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

    // 1. Fetch Services
    const { data: servData } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', activeId);
    
    if (servData) setServices(servData);

    // 2. Fetch Bookings
    const { data: bookData } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('provider_business_id', activeId)
      .order('created_at', { ascending: false });
      
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
    const { error } = await supabase
      .from('service_bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    } else {
      alert("Failed to update status: " + error.message);
    }
  };

  // --- HELPER: Get Service Details ---
  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? { name: service.name, price: service.price } : { name: 'Unknown Service', price: 0 };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 min-h-screen bg-[#F8F9FB] font-sans">
      
      {/* 🟣 PREMIUM HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-inner">
            🛠️
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Service Dashboard</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Manage your daily bookings & services</p>
          </div>
        </div>
        <Link href="/owner" className="w-full sm:w-auto text-center bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-black transition active:scale-95">
          ← Main Panel
        </Link>
      </div>

      {/* 🔘 TABS */}
      <div className="flex space-x-1 bg-gray-200/60 p-1.5 rounded-2xl mb-6">
        <button 
          onClick={() => setActiveTab('bookings')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'bookings' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Bookings 
          {bookings.filter(b => b.status === 'pending').length > 0 && (
            <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
              {bookings.filter(b => b.status === 'pending').length} New
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'services' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          My Services
        </button>
      </div>

      {/* ================= BOOKINGS TAB ================= */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-800 font-bold text-lg">Abhi tak koi booking nahi aayi.</p>
              <p className="text-gray-500 text-sm mt-1">Jab koi customer book karega, wo yahan dikhega.</p>
              <button onClick={fetchData} className="mt-4 text-purple-600 font-semibold text-sm hover:underline">
                Refresh Karo 🔄
              </button>
            </div>
          ) : (
            bookings.map((booking) => {
              const serviceDetails = getServiceDetails(booking.service_id);

              return (
                <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative overflow-hidden">
                  {/* Status Ribbon */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                      booking.status === 'pending' ? 'bg-yellow-400' : 
                      booking.status === 'accepted' ? 'bg-green-500' : 
                      'bg-red-500'
                    }`}></div>

                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{serviceDetails.name}</h3>
                      <p className="text-sm text-purple-600 font-bold bg-purple-50 inline-block px-2 py-0.5 rounded mt-1">
                        Charges: ₹{serviceDetails.price}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                      booking.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' : 
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl ml-2">
                    <p className="flex flex-col">
                      <span className="text-xs text-gray-400 font-semibold uppercase">Customer</span> 
                      <span className="font-medium">{booking.customer_name}</span>
                    </p>
                    <p className="flex flex-col">
                      <span className="text-xs text-gray-400 font-semibold uppercase">Phone</span> 
                      <span className="font-medium text-blue-600">{booking.customer_phone}</span>
                    </p>
                    <p className="flex flex-col">
                      <span className="text-xs text-gray-400 font-semibold uppercase">Date</span> 
                      <span className="font-medium">{booking.booking_date}</span>
                    </p>
                    <p className="flex flex-col">
                      <span className="text-xs text-gray-400 font-semibold uppercase">Time</span> 
                      <span className="font-medium">{booking.booking_time || 'Any time'}</span>
                    </p>
                  </div>
                  
                  {booking.notes && (
                    <div className="ml-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Customer Note:</p>
                      <p className="text-sm text-blue-700 italic">{booking.notes}</p>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  {booking.status === 'pending' && (
                    <div className="flex space-x-3 pt-2 pl-2">
                      <button onClick={() => handleUpdateBooking(booking.id, 'rejected')} className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-xl font-bold hover:bg-red-50 transition active:scale-95">Reject</button>
                      <button onClick={() => handleUpdateBooking(booking.id, 'accepted')} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-md transition active:scale-95">Accept Order</button>
                    </div>
                  )}
                  {booking.status === 'accepted' && (
                     <button onClick={() => handleUpdateBooking(booking.id, 'completed')} className="w-[calc(100%-8px)] ml-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md transition active:scale-95 mt-2">Mark as Completed</button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= SERVICES TAB ================= */}
      {activeTab === 'services' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Your Services</h2>
              <p className="text-xs text-gray-500">Services customers can book</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-purple-700 transition active:scale-95">
              + Add New
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="text-4xl mb-3">🧰</div>
                <p className="text-gray-800 font-bold">Aapne abhi tak koi service add nahi ki hai.</p>
                <p className="text-gray-500 text-sm mt-1">Add New button dabakar shuru karein.</p>
              </div>
            ) : (
              services.map((service) => (
                <div key={service.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-gray-800">{service.name}</h3>
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-100">Active</span>
                    </div>
                    <p className="text-2xl font-black text-purple-600 mt-2">₹{service.price}</p>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{service.description || 'No description provided.'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= ADD SERVICE MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800">Add New Service</h2>
              <p className="text-xs text-gray-500 mt-1">Jo service aap dena chahte hain, uski details bharein.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Service Name *</label>
                <input type="text" placeholder="e.g. AC Repair, Plumber" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition" />
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-700">Charges (₹) *</label>
                <input type="number" placeholder="e.g. 500" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition" />
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-700">Description (Optional)</label>
                <textarea placeholder="Service ke baare me thoda likhein..." value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition" rows={3}></textarea>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleSaveService} className="flex-1 bg-purple-600 py-3 rounded-xl font-bold text-white hover:bg-purple-700 shadow-md transition">Save Service</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}