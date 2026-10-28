'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = {
  id: string;
  name: string;
  price: number;
  description: string;
  business_id: string;
};

export default function CustomerHome() {
  const router = useRouter();
  const supabase = createClient();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingForm, setBookingForm] = useState({
    name: '', phone: '', date: new Date().toISOString().split("T")[0], time: '10:00', notes: ''
  });

  // Quotation Modal States
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ requirement: '', details: '', phone: '', name: '' });

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').eq('is_active', true);
    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- SUBMIT BOOKING (With Notification) ---
  const handleBookService = async () => {
    if (!bookingForm.name || !bookingForm.phone) return alert("Name and Phone required");
    if (!selectedService) return;

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
      // 👇 Notification Bhejna Provider ko
      await supabase.from('notifications').insert([{
        business_id: selectedService.business_id,
        title: 'New Booking Received! 🎉',
        message: `${bookingForm.name} booked ${selectedService.name} for ₹${selectedService.price}.`,
        type: 'booking'
      }]);

      alert("Booking Successful! Provider will contact you.");
      setIsBookingModalOpen(false);
      setBookingForm({ name: '', phone: '', date: new Date().toISOString().split("T")[0], time: '10:00', notes: '' });
    } else {
      alert("Error: " + error.message);
    }
  };

  // --- SUBMIT QUOTATION REQUEST ---
  const handleRequestQuotation = async () => {
    if (!quoteForm.requirement || !quoteForm.phone) return alert("Please fill requirement and phone number");

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      customer_name: quoteForm.name || "Customer",
      customer_phone: quoteForm.phone,
      requirement: quoteForm.requirement,
      details: quoteForm.details,
      status: 'pending',
      customer_id: user?.id || null
    };

    const { error } = await supabase.from('quotations').insert([payload]);
    
    if (!error) {
      // Quotation me direct provider select nahi hota, isliye hum skip kar rahe hain
      // Agar aap chahein toh sabhi providers ko notify karne ka logic bana sakte hain
      alert("Quotation Request Sent! Shops will send you estimates soon.");
      setIsQuoteModalOpen(false);
      setQuoteForm({ requirement: '', details: '', phone: '', name: '' });
    } else {
      alert("Error sending request: " + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] pb-24 font-sans">
      <header className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-b-[2.5rem] px-6 pt-12 pb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white text-xl font-bold border border-white/30 shadow-inner">
              V
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">VyapaarSetu</h1>
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">Customer App</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition">
            Logout
          </button>
        </div>
        <div className="relative z-10 mb-4">
          <h2 className="text-2xl font-black text-white">Namaste, Customer!</h2>
          <p className="text-blue-100 text-sm mt-1">Discover local shops & book services near you.</p>
        </div>
      </header>

      <div className="px-5 mt-6 space-y-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center p-2">
          <span className="text-gray-400 pl-3">🔍</span>
          <input type="text" placeholder="Search shops, products, services..." className="w-full bg-transparent outline-none text-sm p-3 text-gray-700 font-medium" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div onClick={() => setIsQuoteModalOpen(true)} className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl p-4 shadow-lg flex flex-col justify-center relative overflow-hidden cursor-pointer active:scale-95 transition">
            <div className="absolute right-0 top-0 text-6xl opacity-20">📄</div>
            <div className="relative z-10">
              <p className="text-white font-bold text-sm">Need an Estimate?</p>
              <p className="text-orange-50 text-[10px] mt-1">Request quotes from providers</p>
            </div>
          </div>

          <Link href="/customer/requests" className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg flex flex-col justify-center relative overflow-hidden active:scale-95 transition">
             <div className="absolute right-0 top-0 text-6xl opacity-20">📋</div>
            <div className="relative z-10">
              <p className="text-white font-bold text-sm">View Quotes</p>
              <p className="text-blue-100 text-[10px] mt-1">See estimates received</p>
            </div>
          </Link>
        </div>

        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-800">Services Near You</h2>
            <Link href="/customer/bookings" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">My Bookings</Link>
          </div>
          
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading services...</p>
          ) : services.length === 0 ? (
            <div className="bg-white p-4 rounded-xl text-center shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Abhi koi service available nahi hai.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800">{service.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{service.description || 'No description'}</p>
                    <p className="text-blue-600 font-bold mt-1 text-sm">₹{service.price}</p>
                  </div>
                  <button onClick={() => { setSelectedService(service); setIsBookingModalOpen(true); }} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold text-xs active:scale-95 transition">
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* BOOKING MODAL */}
      {isBookingModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Book: {selectedService.name}</h2>
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
              <button onClick={handleBookService} className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold text-white">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* QUOTATION MODAL */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Request Quotation</h2>
            <p className="text-xs text-gray-500 mb-2">Bataiye aapko kya kaam karwana hai, providers aapko estimate bhejenge.</p>
            
            <input type="text" placeholder="Kya chahiye? (e.g. AC Repair, 10kg Sugar) *" value={quoteForm.requirement} onChange={e => setQuoteForm({...quoteForm, requirement: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none focus:ring-2 focus:ring-orange-500" />
            <textarea placeholder="Details (Optional)" value={quoteForm.details} onChange={e => setQuoteForm({...quoteForm, details: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" rows={2}></textarea>
            <input type="text" placeholder="Your Name" value={quoteForm.name} onChange={e => setQuoteForm({...quoteForm, name: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" />
            <input type="tel" placeholder="Phone Number *" value={quoteForm.phone} onChange={e => setQuoteForm({...quoteForm, phone: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none focus:ring-2 focus:ring-orange-500" />

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