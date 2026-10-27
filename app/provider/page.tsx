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
  service_id: string; // Join hata kar service_id use kar rahe hain
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

    // 1. Fetch Provider's Services
    const { data: servData } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', activeId);
    
    if (servData) setServices(servData);

    // 2. Fetch Bookings for this provider (Simple Select, No Join)
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
    if (!activeId) return alert("Business ID not found");
    
    const { error } = await supabase.from('services').insert([{
      business_id: activeId,
      name: newService.name,
      price: Number(newService.price),
      description: newService.description
    }]);

    if (!error) {
      setIsModalOpen(false);
      setNewService({ name: '', price: '', description: '' });
      fetchData(); // Refresh list
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

  // --- HELPER: Get Service Details for a Booking ---
  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? { name: service.name, price: service.price } : { name: 'Unknown Service', price: 0 };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-semibold text-gray-600">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 min-h-screen bg-gray-50">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Service Dashboard</h1>
          <p className="text-sm text-gray-500">Manage your services & bookings</p>
        </div>
        <Link href="/owner" className="w-full sm:w-auto text-center bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-gray-900 transition">
          ← Main Panel
        </Link>
      </div>

      {/* TABS */}
      <div className="flex space-x-2 bg-gray-200 p-1 rounded-xl mb-6">
        <button 
          onClick={() => setActiveTab('bookings')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-lg transition-all ${activeTab === 'bookings' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Bookings ({bookings.filter(b => b.status === 'pending').length} New)
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-lg transition-all ${activeTab === 'services' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          My Services
        </button>
      </div>

      {/* ================= BOOKINGS TAB ================= */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-lg">Abhi tak koi booking nahi aayi.</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const serviceDetails = getServiceDetails(booking.service_id);

              return (
                <div key={booking.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{serviceDetails.name}</h3>
                      <p className="text-sm text-purple-600 font-bold">Charges: ₹{serviceDetails.price}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                      booking.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <p><span className="font-semibold text-gray-500">Customer:</span> {booking.customer_name}</p>
                    <p><span className="font-semibold text-gray-500">Phone:</span> {booking.customer_phone}</p>
                    <p><span className="font-semibold text-gray-500">Date:</span> {booking.booking_date}</p>
                    <p><span className="font-semibold text-gray-500">Time:</span> {booking.booking_time || 'Any time'}</p>
                  </div>
                  
                  {booking.notes && (
                    <p className="text-sm text-gray-600 italic">Note: {booking.notes}</p>
                  )}

                  {/* ACTION BUTTONS */}
                  {booking.status === 'pending' && (
                    <div className="flex space-x-3 pt-2">
                      <button onClick={() => handleUpdateBooking(booking.id, 'rejected')} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-semibold border border-red-100 hover:bg-red-100">Reject</button>
                      <button onClick={() => handleUpdateBooking(booking.id, 'accepted')} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 shadow-sm">Accept Order</button>
                    </div>
                  )}
                  {booking.status === 'accepted' && (
                     <button onClick={() => handleUpdateBooking(booking.id, 'completed')} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Mark as Completed</button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= SERVICES TAB ================= */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Your Active Services</h2>
            <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700">
              + Add Service
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.length === 0 ? (
              <div className="col-span-2 text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Aapne abhi tak koi service add nahi ki hai.</p>
              </div>
            ) : (
              services.map((service) => (
                <div key={service.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{service.name}</h3>
                    <p className="text-purple-600 font-bold">₹{service.price}</p>
                    <p className="text-sm text-gray-500 mt-1">{service.description || 'No description'}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">Active</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= ADD SERVICE MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Add New Service</h2>
            
            <div>
              <label className="text-sm font-semibold text-gray-600">Service Name *</label>
              <input type="text" placeholder="e.g. AC Repair" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full p-3 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-gray-600">Charges (₹) *</label>
              <input type="number" placeholder="e.g. 500" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="w-full p-3 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-gray-600">Description</label>
              <textarea placeholder="Details about the service..." value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full p-3 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-purple-500" rows={3}></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-lg font-bold text-gray-700 hover:bg-gray-200">Cancel</button>
              <button onClick={handleSaveService} className="flex-1 bg-purple-600 py-3 rounded-lg font-bold text-white hover:bg-purple-700">Save Service</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}