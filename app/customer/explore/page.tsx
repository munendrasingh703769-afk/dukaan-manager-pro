'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerExplorePage() {
  const supabase = createClient();
  const router = useRouter();

  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Booking Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    name: '', phone: '', date: new Date().toISOString().split("T")[0], time: '10:00', notes: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: catData } = await supabase.from('service_categories').select('*').eq('is_active', true);
      if (catData) setCategories(catData);

      const { data: servData } = await supabase
        .from('services')
        .select(`*, businesses!inner (name, city, logo_url)`)
        .eq('is_active', true);
      if (servData) setServices(servData);
      
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const filteredServices = selectedCategory 
    ? services.filter(s => s.category_id === selectedCategory) 
    : services;

  // --- SUBMIT BOOKING ---
  const handleBookService = async () => {
    if (!bookingForm.name || !bookingForm.phone) return alert("Name and Phone required");
    if (!selectedService) return;

    setBookingLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      service_id: selectedService.id,
      provider_business_id: selectedService.business_id,
      customer_name: bookingForm.name,
      customer_phone: bookingForm.phone,
      booking_date: bookingForm.date,
      booking_time: bookingForm.time,
      notes: bookingForm.notes,
      status: 'pending',
      customer_id: user?.id || null 
    };

    const { error } = await supabase.from('service_bookings').insert([payload]);
    
    if (!error) {
      await supabase.from('notifications').insert([{
        business_id: selectedService.business_id,
        title: 'New Booking Received! 🎉',
        message: `${bookingForm.name} booked ${selectedService.name} for ₹${selectedService.price}.`,
        type: 'booking'
      }]);
      alert("Booking Successful!");
      setIsBookingModalOpen(false);
      router.push('/customer/bookings');
    } else {
      alert("Error: " + error.message);
    }
    setBookingLoading(false);
  };

  // 🎯 RENDER CATEGORIES BY GROUP
  const renderCategoryGroup = (title: string, catNames: string[]) => {
    const filteredCats = categories.filter(c => catNames.includes(c.name));
    if (filteredCats.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 ml-1 border-b pb-1">{title}</h3>
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {filteredCats.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedCategory(c.id === selectedCategory ? null : c.id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-pointer transition ${selectedCategory === c.id ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : 'hover:bg-gray-50 border border-transparent'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${selectedCategory === c.id ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                {c.icon}
              </div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight line-clamp-2">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Explore Services</h1>
        <Link href="/customer" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">← Home</Link>
      </div>

      <div className="px-4 bg-white border-b border-gray-100 py-4 shadow-sm mt-4 rounded-b-3xl">
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-sm font-bold text-gray-800">All Categories</h2>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Clear Filter</button>
          )}
        </div>
        
        {/* Hardcoded Groups Render */}
        {renderCategoryGroup('🏠 Home & Repair Services', ['AC & Appliance', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Labour & Helper', 'Home Cleaning', 'Pest Control', 'Packers & Movers'])}
        {renderCategoryGroup('💻 IT & Tech Services', ['Wi-Fi & Internet', 'CCTV & Security', 'Computer & Laptop', 'Mobile Repair'])}
        {renderCategoryGroup('🛵 Transport & Delivery', ['Bike Taxi', 'Car Rental', 'Parcel Delivery'])}
        {renderCategoryGroup('🏦 Financial & Loans', ['Personal Loan', 'Home Loan', 'Gold Loan', 'Business Loan'])}
        {renderCategoryGroup('📚 Education & Digital', ['Tuition & Education', 'Digital Services'])}
        
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-3 mt-2">
        <h2 className="text-sm font-bold text-gray-800 mb-2">
          {selectedCategory ? 'Services in this category' : 'All Available Services'}
        </h2>

        {loading ? (
          <p className="text-center font-bold text-indigo-600 py-10">Loading Services...</p>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-800 font-bold text-lg">Is category me abhi koi service nahi hai.</p>
          </div>
        ) : (
          filteredServices.map(service => (
            <div key={service.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-800">{service.name}</h4>
                <p className="text-xs text-gray-500 font-semibold">{service.businesses?.name} ({service.businesses?.city})</p>
                <p className="text-blue-600 font-black mt-1 text-lg">₹{service.price}</p>
              </div>
              <button onClick={() => { setSelectedService(service); setIsBookingModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md">Book Now</button>
            </div>
          ))
        )}
      </div>

      {/* BOOKING MODAL */}
      {isBookingModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Book: {selectedService.name}</h2>
            <p className="text-sm text-gray-500">Price: ₹{selectedService.price}</p>
            
            <input type="text" placeholder="Your Name *" value={bookingForm.name} onChange={e => setBookingForm({...bookingForm, name: e.target.value})} className="w-full p-3 border rounded-xl" />
            <input type="tel" placeholder="Phone Number *" value={bookingForm.phone} onChange={e => setBookingForm({...bookingForm, phone: e.target.value})} className="w-full p-3 border rounded-xl" />
            
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} className="w-full p-3 border rounded-xl" />
              <input type="time" value={bookingForm.time} onChange={e => setBookingForm({...bookingForm, time: e.target.value})} className="w-full p-3 border rounded-xl" />
            </div>
            
            <input type="text" placeholder="Notes (Optional)" value={bookingForm.notes} onChange={e => setBookingForm({...bookingForm, notes: e.target.value})} className="w-full p-3 border rounded-xl" />

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsBookingModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleBookService} disabled={bookingLoading} className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold text-white disabled:opacity-50">
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}