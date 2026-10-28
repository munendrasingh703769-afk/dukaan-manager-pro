'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Service = { id: string; name: string; price: number; }
type Booking = { 
  id: string; customer_name: string; booking_date: string; status: string; 
  service_id: string; created_at: string;
}

export default function ProviderEarningsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId);
    if (servData) setServices(servData);

    const { data: bookData } = await supabase
      .from('service_bookings')
      .select('*')
      .eq('provider_business_id', activeId)
      .order('created_at', { ascending: false });
    if (bookData) setBookings(bookData as any);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  const getServiceDetails = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    return s ? { name: s.name, price: s.price } : { name: 'Unknown Service', price: 0 };
  };

  // --- CALCULATIONS ---
  const completedJobs = bookings.filter(b => b.status === 'completed');
  
  // Total Earnings (Sirf completed jobs ka paisa)
  const totalEarned = completedJobs.reduce((acc, curr) => acc + getServiceDetails(curr.service_id).price, 0);
  
  // Pending Amount (Jo accepted hain par complete nahi hue)
  const pendingJobs = bookings.filter(b => b.status === 'accepted' || b.status === 'pending');
  const pendingAmount = pendingJobs.reduce((acc, curr) => acc + getServiceDetails(curr.service_id).price, 0);

  // Recent Completed Transactions
  const recentTransactions = completedJobs.slice(0, 10); // Top 10 recent

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Earnings...</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Earnings & Reports</h1>
          <p className="text-sm text-gray-500">Track your revenue and completed jobs</p>
        </div>
        <button onClick={fetchData} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition">
          🔄 Refresh
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-700 p-6 rounded-2xl shadow-lg text-white">
          <p className="text-green-100 text-sm font-semibold mb-1">Total Earned</p>
          <h3 className="text-4xl font-black">₹{totalEarned}</h3>
          <p className="text-green-200 text-xs mt-2">From {completedJobs.length} completed jobs</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center text-xl">⏳</div>
            <p className="text-sm text-gray-500 font-bold">Pending Amount</p>
          </div>
          <h3 className="text-3xl font-black text-gray-800">₹{pendingAmount}</h3>
          <p className="text-xs text-gray-400 mt-1">From {pendingJobs.length} active/pending jobs</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">📊</div>
            <p className="text-sm text-gray-500 font-bold">Total Jobs</p>
          </div>
          <h3 className="text-3xl font-black text-gray-800">{bookings.length}</h3>
          <p className="text-xs text-gray-400 mt-1">Overall bookings received</p>
        </div>
      </div>

      {/* RECENT TRANSACTIONS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-800">Recent Transactions</h2>
          <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">Last 10</span>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 font-medium">Abhi tak koi kaam complete nahi hua hai.</p>
            <p className="text-sm text-gray-400 mt-1">Job complete hone par paisa yahan dikhega.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentTransactions.map((job) => {
              const service = getServiceDetails(job.service_id);
              return (
                <div key={job.id} className="p-4 md:p-5 flex justify-between items-center hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-lg border border-green-100">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm md:text-base">{job.customer_name}</h4>
                      <p className="text-xs text-gray-500">{service.name} • {job.booking_date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-green-600 text-base md:text-lg">+ ₹{service.price}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Completed</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}