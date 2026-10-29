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

  // Custom Request States
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customReq, setCustomReq] = useState({ name: '', category: '', description: '' });
  const [submittingCustom, setSubmittingCustom] = useState(false);

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

  // 🎯 SMART GROUPING LOGIC (Aapki requirement ke hisaab se update kiya gaya)
  const getGroupedCategories = () => {
    const groups: { [key: string]: any[] } = {
      '🛍️ Shopping (Fashion, Electronics & More)': [],
      '💊 Medicine & Health': [],
      '🛒 Grocery & Food': [],
      '🏦 Financial & Loans': [],
      '🏠 Home & Repair Services': [],
      '💻 IT & Tech Services': [],
      '🛵 Transport & Delivery': [],
      '📚 Education & Digital': [],
      'Other Services': []
    };

    categories.forEach(cat => {
      const name = cat.name.toLowerCase();
      
      // 1. Shopping (Clothes, Shoes, Kids, Cosmetics, Electronics)
      if (name.includes('fashion') || name.includes('cloth') || name.includes('shoe') || name.includes('kid') || name.includes('toy') || name.includes('beauty') || name.includes('cosmetic') || name.includes('salon') || name.includes('electronic') || name.includes('tv')) {
        groups['🛍️ Shopping (Fashion, Electronics & More)'].push(cat);
      }
      // 2. Medicine (Only Health)
      else if (name.includes('medical') || name.includes('medicine') || name.includes('pharmacy') || name.includes('health')) {
        groups['💊 Medicine & Health'].push(cat);
      }
      // 3. Grocery & Food
      else if (name.includes('grocery') || name.includes('food') || name.includes('sweet') || name.includes('bakery') || name.includes('restaurant')) {
        groups['🛒 Grocery & Food'].push(cat);
      }
      // 4. Loans
      else if (name.includes('loan') || name.includes('finance') || name.includes('property') || name.includes('gold')) {
        groups['🏦 Financial & Loans'].push(cat);
      } 
      // 5. Home & Repair
      else if (name.includes('ac') || name.includes('appliance') || name.includes('plumb') || name.includes('electric') || name.includes('carpenter') || name.includes('paint') || name.includes('labour') || name.includes('clean') || name.includes('pest') || name.includes('mover')) {
        groups['🏠 Home & Repair Services'].push(cat);
      } 
      // 6. IT & Tech
      else if (name.includes('wi-fi') || name.includes('internet') || name.includes('cctv') || name.includes('computer') || name.includes('laptop') || name.includes('mobile') || name.includes('security')) {
        groups['💻 IT & Tech Services'].push(cat);
      } 
      // 7. Transport
      else if (name.includes('bike') || name.includes('car') || name.includes('taxi') || name.includes('parcel') || name.includes('rental')) {
        groups['🛵 Transport & Delivery'].push(cat);
      } 
      // 8. Education
      else if (name.includes('tuition') || name.includes('education') || name.includes('digital')) {
        groups['📚 Education & Digital'].push(cat);
      } 
      // Others
      else {
        groups['Other Services'].push(cat);
      }
    });

    return groups;
  };

  const groupedCategories = getGroupedCategories();

  // --- SUBMIT CUSTOM REQUEST ---
  const handleCustomRequest = async () => {
    if (!customReq.name) return alert("Kripya service ka naam likhein.");
    setSubmittingCustom(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('custom_service_requests').insert([{
      customer_id: user?.id || null,
      requested_name: customReq.name,
      description: `Category: ${customReq.category}\nDetails: ${customReq.description}`,
      status: 'pending'
    }]);

    if (!error) {
      alert("Aapki request Admin ko bhej di gayi hai!");
      setIsCustomModalOpen(false);
      setCustomReq({ name: '', category: '', description: '' });
    } else {
      alert("Error: " + error.message);
    }
    setSubmittingCustom(false);
  };

  // --- SUBMIT SERVICE BOOKING ---
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

      alert("Booking Successful! Provider will contact you.");
      setIsBookingModalOpen(false);
      router.push('/customer/bookings');
    } else {
      alert("Error: " + error.message);
    }
    setBookingLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Explore Services</h1>
        <Link href="/customer" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">← Home</Link>
      </div>

      {/* Custom Request Banner */}
      <div className="p-4">
        <div 
          onClick={() => setIsCustomModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 shadow-lg flex items-center justify-between cursor-pointer active:scale-95 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl text-white">➕</div>
            <div>
              <p className="text-white font-bold text-sm">Service nahi mil rahi?</p>
              <p className="text-blue-100 text-xs mt-0.5">Yahan nayi service ki request bhejein</p>
            </div>
          </div>
          <div className="text-white text-xl">→</div>
        </div>
      </div>

      {/* Categories Grouped */}
      <div className="px-4 bg-white border-b border-gray-100 py-4 shadow-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-sm font-bold text-gray-800">All Categories</h2>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Clear Filter</button>
          )}
        </div>
        
        {/* Loop through groups */}
        {Object.keys(groupedCategories).map((groupName) => {
          const cats = groupedCategories[groupName];
          if (cats.length === 0) return null; // Agar group khali hai toh mat dikhao

          return (
            <div key={groupName} className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{groupName}</h3>
              <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                {cats.map(c => (
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
        })}
      </div>

      {/* Services List */}
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
            <p className="text-gray-500 text-sm mt-1">Kripya upar diye gaye button se request bhejein.</p>
          </div>
        ) : (
          filteredServices.map(service => (
            <div key={service.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-800">{service.name}</h4>
                <p className="text-xs text-gray-500 font-semibold">{service.businesses?.name} ({service.businesses?.city})</p>
                <p className="text-blue-600 font-black mt-1 text-lg">₹{service.price}</p>
              </div>
              <button 
                onClick={() => { setSelectedService(service); setIsBookingModalOpen(true); }} 
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md"
              >
                Book Now
              </button>
            </div>
          ))
        )}
      </div>

      {/* ================= CUSTOM REQUEST MODAL ================= */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Request Custom Service</h2>
            <div>
              <label className="text-sm font-bold text-gray-700">Service Name *</label>
              <input type="text" placeholder="e.g. Drone Camera Repair" value={customReq.name} onChange={e => setCustomReq({...customReq, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Suggest Category</label>
              <select value={customReq.category} onChange={e => setCustomReq({...customReq, category: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Select Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                ))}
                <option value="Other">Other / Not Listed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Details (Optional)</label>
              <textarea placeholder="Apni zaroorat likhein..." value={customReq.description} onChange={e => setCustomReq({...customReq, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" rows={2}></textarea>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsCustomModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleCustomRequest} disabled={submittingCustom} className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold text-white disabled:opacity-50">
                {submittingCustom ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOOKING MODAL ================= */}
      {isBookingModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="text-center mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Booking with</p>
              <h2 className="text-lg font-black text-indigo-700">{selectedService.businesses?.name}</h2>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{selectedService.name}</h2>
            <p className="text-sm text-gray-500">Price: ₹{selectedService.price}</p>
            
            <input type="text" placeholder="Your Name *" value={bookingForm.name} onChange={e => setBookingForm({...bookingForm, name: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="tel" placeholder="Phone Number *" value={bookingForm.phone} onChange={e => setBookingForm({...bookingForm, phone: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" />
            
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" />
              <input type="time" value={bookingForm.time} onChange={e => setBookingForm({...bookingForm, time: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" />
            </div>
            
            <input type="text" placeholder="Notes (Optional)" value={bookingForm.notes} onChange={e => setBookingForm({...bookingForm, notes: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" />

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