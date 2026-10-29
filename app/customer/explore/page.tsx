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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Explore Services</h1>
        <Link href="/customer" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">← Home</Link>
      </div>

      {/* Categories Grid */}
      <div className="p-4 bg-white border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800 mb-3">All Categories</h2>
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
            <p className="text-gray-500 text-sm mt-1">Kripya koi doosri category select karein.</p>
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

    </div>
  )
}