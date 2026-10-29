'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CustomerExplorePage() {
  const supabase = createClient();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Custom Request Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customReq, setCustomReq] = useState({ name: '', category: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all categories
      const { data: catData } = await supabase.from('service_categories').select('*').eq('is_active', true).order('name');
      if (catData) setCategories(catData);

      // Fetch all active services
      const { data: servData } = await supabase
        .from('services')
        .select(`*, businesses!inner (name, city, logo_url)`)
        .eq('is_active', true);
      if (servData) setServices(servData);
      
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  // Filter services based on selected category
  const filteredServices = selectedCategory 
    ? services.filter(s => s.category_id === selectedCategory) 
    : services;

  // --- SUBMIT CUSTOM REQUEST ---
  const handleCustomRequest = async () => {
    if (!customReq.name) return alert("Kripya service ka naam likhein.");
    
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('custom_service_requests').insert([{
      customer_id: user?.id || null,
      requested_name: customReq.name,
      description: `Category: ${customReq.category}\nDetails: ${customReq.description}`,
      status: 'pending'
    }]);

    if (!error) {
      alert("Aapki request Admin ko bhej di gayi hai! Wo approve karne ke baad ye service add ho jayegi.");
      setIsModalOpen(false);
      setCustomReq({ name: '', category: '', description: '' });
    } else {
      alert("Error: " + error.message);
    }
    setSubmitting(false);
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
          onClick={() => setIsModalOpen(true)}
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

      {/* Categories Grid */}
      <div className="px-4 bg-white border-b border-gray-100 py-3">
        <h2 className="text-sm font-bold text-gray-800 mb-3 px-1">All Categories</h2>
        <div className="grid grid-cols-4 gap-3">
          {categories.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedCategory(c.id === selectedCategory ? null : c.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition ${selectedCategory === c.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${selectedCategory === c.id ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                {c.icon}
              </div>
              <span className="text-[9px] font-bold text-gray-700 text-center leading-tight line-clamp-2">{c.name}</span>
            </div>
          ))}
        </div>
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
              <button onClick={() => alert("Booking feature coming soon!")} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md">Book Now</button>
            </div>
          ))
        )}
      </div>

      {/* ================= CUSTOM REQUEST MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Request Custom Service</h2>
            <p className="text-xs text-gray-500 mb-2">Aapko jo service chahiye wo yahan likhein. Admin approve karne ke baad ye service add ho jayegi.</p>
            
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
              <textarea placeholder="Apni zaroorat thoda detail me likhein..." value={customReq.description} onChange={e => setCustomReq({...customReq, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" rows={2}></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleCustomRequest} disabled={submitting} className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold text-white hover:bg-indigo-700 shadow-md transition disabled:opacity-50">
                {submitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}