'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Booking = { id: string; status: string; service_id: string; }
type Quotation = { id: string; status: string; }

export default function ProviderDashboardHome() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeId) return;
      setLoading(true);

      // Fetch Services
      const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId);
      if (servData) setServices(servData);

      // Fetch Bookings
      const { data: bookData } = await supabase.from('service_bookings').select('*').eq('provider_business_id', activeId);
      if (bookData) setBookings(bookData as any);

      // Fetch Quotations
      const { data: quoteData } = await supabase.from('quotations').select('*').eq('provider_business_id', activeId);
      if (quoteData) setQuotations(quoteData as any);

      setLoading(false);
    };
    fetchData();
  }, [activeId, supabase]);

  const getServicePrice = (serviceId: string) => {
    const s = services.find((x: any) => x.id === serviceId);
    return s ? s.price : 0;
  };

  // Stats Calculations
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const pendingQuotes = quotations.filter(q => q.status === 'pending').length;
  const totalEarnings = bookings
    .filter(b => b.status === 'completed')
    .reduce((acc, curr) => acc + getServicePrice(curr.service_id), 0);

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Dashboard...</div>;

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-lg relative overflow-hidden">
        <div className="relative z-10 mb-6 md:mb-0">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome Back, Provider! 👋</h2>
          <p className="text-blue-200 mb-4 max-w-md">Aapka business badhane ke liye hum hamesha taiyar hain.</p>
          <div className="flex gap-3">
            <Link href="/provider/bookings" className="bg-blue-500 hover:bg-blue-600 px-5 py-2.5 rounded-lg font-bold text-sm transition">View Bookings</Link>
            <Link href="/provider/quotations" className="bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg font-bold text-sm transition">Check Quotes</Link>
          </div>
        </div>
        <div className="text-6xl relative z-10 hidden md:block">📈</div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Link href="/provider/bookings" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-3">📦</div>
          <p className="text-sm text-gray-500 font-semibold mb-1">Bookings</p>
          <h3 className="text-2xl font-bold text-gray-800">{totalBookings}</h3>
        </Link>

        <Link href="/provider/bookings" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center text-xl mb-3">⏳</div>
          <p className="text-sm text-gray-500 font-semibold mb-1">Pending</p>
          <h3 className="text-2xl font-bold text-gray-800">{pendingBookings}</h3>
        </Link>

        <Link href="/provider/quotations" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl mb-3">📄</div>
          <p className="text-sm text-gray-500 font-semibold mb-1">New Quotes</p>
          <h3 className="text-2xl font-bold text-gray-800">{pendingQuotes}</h3>
        </Link>

        <Link href="/provider/earnings" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl mb-3">💰</div>
          <p className="text-sm text-gray-500 font-semibold mb-1">Earnings</p>
          <h3 className="text-2xl font-bold text-gray-800">₹{totalEarnings}</h3>
        </Link>

      </div>

      {/* Placeholder for Future Widgets */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center py-12">
         <p className="text-gray-400 font-semibold">More charts and recent orders will be added here.</p>
      </div>

    </div>
  );
}