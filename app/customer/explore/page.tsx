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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null); 

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    name: '', phone: '', date: new Date().toISOString().split("T")[0], time: '10:00', notes: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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

  const filteredServices = services.filter(service => {
    const matchesSearch = searchQuery 
      ? service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (service.businesses?.name && service.businesses.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    const matchesCategory = selectedCategory ? service.category_id === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleCategoryClick = (id: string, name: string) => {
    setSelectedCategory(id);
    setSelectedCategoryName(name);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedCategoryName(null);
    setSearchQuery('');
  };

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

  // 🎯 DYNAMIC GROUPING LOGIC
  const getGroupedCategories = () => {
    const groups: { [key: string]: any[] } = {
      '🏠 Home & Repair Services': [],
      '💻 IT, Telecom & Tech': [],
      '🛵 Transport & Delivery': [],
      '🛒 Shopping & Daily Needs': [],
      '📚 Education & Digital': [],
      '🏦 Financial & Loans': [],
      'Other Services': []
    };

    categories.forEach(cat => {
      const name = cat.name.toLowerCase();
      if (name.includes('loan') || name.includes('finance') || name.includes('property') || name.includes('gold')) {
        groups['🏦 Financial & Loans'].push(cat);
      } 
      else if (name.includes('ac') || name.includes('appliance') || name.includes('plumb') || name.includes('electric') || name.includes('carpenter') || name.includes('paint') || name.includes('labour') || name.includes('clean') || name.includes('pest') || name.includes('mover')) {
        groups['🏠 Home & Repair Services'].push(cat);
      } 
      else if (name.includes('wi-fi') || name.includes('internet') || name.includes('cctv') || name.includes('computer') || name.includes('laptop') || name.includes('mobile') || name.includes('security')) {
        groups['💻 IT, Telecom & Tech'].push(cat);
      } 
      else if (name.includes('bike') || name.includes('car') || name.includes('taxi') || name.includes('parcel') || name.includes('rental')) {
        groups['🛵 Transport & Delivery'].push(cat);
      } 
      else if (name.includes('grocery') || name.includes('medical') || name.includes('fashion') || name.includes('electronic') || name.includes('food') || name.includes('beauty') || name.includes('sweet')) {
        groups['🛒 Shopping & Daily Needs'].push(cat);
      } 
      else if (name.includes('tuition') || name.includes('education') || name.includes('digital')) {
        groups['📚 Education & Digital'].push(cat);
      } 
      else {
        groups['Other Services'].push(cat);
      }
    });
    return groups;
  };

  const groupedCategories = getGroupedCategories();

  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* 🔵 TOP HEADER (Matching Screenshot) */}
      <header className="bg-blue-700 text-white pt-6 pb-6 px-4 rounded-b-3xl shadow-md relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-700 text-2xl font-black">🏪</div>
            <div>
              <h1 className="text-lg font-black tracking-wide">VyapaarSetu</h1>
              <p className="text-blue-200 text-[11px]">Smart Dukaan, Smart Aapke Liye</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/customer" className="relative text-2xl">🔔</Link>
            <Link href="/customer/profile" className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center font-bold border border-blue-400">M</Link>
          </div>
        </div>

        {/* Location & Search */}
        <div className="space-y-3">
          <div className="flex items-center gap-1 text-sm font-medium text-blue-100 bg-blue-600/50 w-max px-3 py-1.5 rounded-full">
            📍 <span>Current Location</span> <span className="text-[10px]">▼</span>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 bg-white rounded-xl flex items-center p-2 shadow-sm">
              <span className="text-gray-400 pl-2">🔍</span>
              <input 
                type="text" 
                placeholder="Search services or providers..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-sm px-2 text-gray-800 font-medium" 
              />
            </div>
            <button className="bg-blue-500 text-white font-bold px-4 rounded-xl shadow-sm flex items-center gap-1">
              <span className="text-lg">Y</span> Filter
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 mt-5 max-w-2xl mx-auto space-y-6">
        
        {/* 🚀 HERO BANNER */}
        {!selectedCategory && !searchQuery && (
          <section>
            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl p-5 relative overflow-hidden flex items-center shadow-sm border border-blue-200">
              <div className="relative z-10 w-3/5">
                <h2 className="text-xl font-black text-blue-900 leading-tight">Trusted local services near you</h2>
                <p className="text-xs text-blue-700 font-medium mt-1">Fast • Reliable • Professional</p>
                <button className="bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg mt-3 shadow-md flex items-center gap-1">
                  Explore Now →
                </button>
              </div>
              <div className="absolute right-[-10px] bottom-[-10px] text-7xl opacity-80">👨‍🔧</div>
            </div>
          </section>
        )}

        {/* 🎯 VIEW 1: CATEGORIES GRID (Screenshot Style) */}
        {!selectedCategory && !searchQuery && (
          <div className="space-y-6">
            {Object.keys(groupedCategories).map((groupName) => {
              const cats = groupedCategories[groupName];
              if (cats.length === 0) return null;

              return (
                <div key={groupName} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[15px] font-black text-gray-800 flex items-center gap-2">
                      {groupName.split(' ')[0]} <span>{groupName.substring(groupName.indexOf(' ') + 1)}</span>
                    </h3>
                    <button className="text-xs font-bold text-blue-600 flex items-center">View All <span className="text-lg leading-none ml-0.5">›</span></button>
                  </div>
                  
                  {/* Category Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {cats.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => handleCategoryClick(c.id, c.name)}
                        className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 transition active:scale-95"
                      >
                        <div className="w-12 h-12 flex items-center justify-center text-3xl">
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
        )}

        {/* 🎯 VIEW 2: SERVICES LIST (When Category clicked or Search active) */}
        {(selectedCategory || searchQuery) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={handleBackToCategories} className="w-8 h-8 bg-white shadow-sm border border-gray-200 rounded-full flex items-center justify-center font-bold text-gray-700">←</button>
              <h2 className="text-lg font-black text-gray-800">
                {searchQuery ? `Search Results` : selectedCategoryName}
              </h2>
            </div>

            {loading ? (
              <p className="text-center font-bold text-blue-600 py-10">Loading Services...</p>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-800 font-bold text-lg">Is category me abhi koi service nahi hai.</p>
                <button onClick={handleBackToCategories} className="mt-4 bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-xl text-sm">← Back</button>
              </div>
            ) : (
              filteredServices.map(service => (
                <div key={service.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-95 transition">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">🛠️</div>
                    <div>
                      <h4 className="font-bold text-gray-800">{service.name}</h4>
                      <p className="text-[11px] text-gray-500 font-medium">{service.businesses?.name}</p>
                      <p className="text-blue-600 font-black mt-1">₹{service.price}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedService(service); setIsBookingModalOpen(true); }} 
                    className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2 rounded-xl font-bold text-xs shadow-sm"
                  >
                    Book
                  </button>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* 📱 BOTTOM NAVIGATION (No Floating Button, 5 Items) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-5 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <Link href="/customer" className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/customer/shop" className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xl">🛍️</span>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        
        {/* Active Services Tab */}
        <Link href="/customer/explore" className="flex flex-col items-center gap-1 text-blue-600">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl shadow-md border-2 border-white -mt-4">
            🧭
          </div>
          <span className="text-[10px] font-bold mt-0.5">Services</span>
        </Link>

        <Link href="/customer/orders" className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xl">📦</span>
          <span className="text-[10px] font-medium">Orders</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>

      {/* BOOKING MODAL */}
      {isBookingModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Book: {selectedService.name}</h2>
            <p className="text-sm text-gray-500">Price: ₹{selectedService.price}</p>
            <input type="text" placeholder="Your Name *" value={bookingForm.name} onChange={e => setBookingForm({...bookingForm, name: e.target.value})} className="w-full p-3 border rounded-xl outline-none" />
            <input type="tel" placeholder="Phone Number *" value={bookingForm.phone} onChange={e => setBookingForm({...bookingForm, phone: e.target.value})} className="w-full p-3 border rounded-xl outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} className="w-full p-3 border rounded-xl outline-none" />
              <input type="time" value={bookingForm.time} onChange={e => setBookingForm({...bookingForm, time: e.target.value})} className="w-full p-3 border rounded-xl outline-none" />
            </div>
            <input type="text" placeholder="Notes (Optional)" value={bookingForm.notes} onChange={e => setBookingForm({...bookingForm, notes: e.target.value})} className="w-full p-3 border rounded-xl outline-none" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsBookingModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleBookService} disabled={bookingLoading} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white disabled:opacity-50">
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}