'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CustomerExplorePage() {
  const supabase = createClient();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('All');

  useEffect(() => {
    const fetchData = async () => {
      // Services fetch karna with Provider details
      const { data: servData } = await supabase
        .from('services')
        .select(`*, businesses!inner (name, city, logo_url)`)
        .eq('is_active', true);
        
      if (servData) {
        setServices(servData);
        const uniqueCities = Array.from(new Set(servData.map((s: any) => s.businesses?.city).filter(Boolean)));
        setCities(uniqueCities as string[]);
      }

      const { data: catData } = await supabase.from('service_categories').select('*').eq('is_active', true);
      if (catData) setCategories(catData);
      
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (service.businesses?.name && service.businesses.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? service.category_id === selectedCategory : true;
    const matchesCity = selectedCity === 'All' ? true : service.businesses?.city === selectedCity;
    return matchesSearch && matchesCategory && matchesCity;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Explore Services</h1>
          <Link href="/customer" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">← Home</Link>
        </div>
        
        {/* Search & Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] p-2 bg-gray-100 rounded-xl outline-none text-sm font-medium" 
          />
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="p-2 bg-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none">
            <option value="All">📍 All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto p-4 no-scrollbar">
        <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${!selectedCategory ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>All</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 ${selectedCategory === c.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Listing */}
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {loading ? <p className="text-center font-bold text-indigo-600">Loading...</p> : 
         filteredServices.length === 0 ? <p className="text-center font-bold text-gray-500 py-10">Kuch nahi mila.</p> :
         filteredServices.map(service => (
          <Link href={`/customer/store/${service.business_id}`} key={service.id} className="block bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2 border-b border-gray-50 pb-2">
               <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {service.businesses?.logo_url ? <img src={service.businesses.logo_url} className="w-full h-full object-cover" /> : '🏪'}
               </div>
               <div>
                  <h4 className="font-bold text-sm text-gray-800">{service.businesses?.name}</h4>
                  <p className="text-[10px] text-gray-500">📍 {service.businesses?.city}</p>
               </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{service.name}</h3>
                <p className="text-lg font-black text-indigo-600">₹{service.price}</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">View Details</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}