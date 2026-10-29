'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function ProviderDashboardHome() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Data States
  const [bookings, setBookings] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get Active ID
        const activeId = getCurrentBusinessId();
        
        if (!activeId) {
          setErrorMsg("Aapka account login nahi hai ya Business ID nahi mili. Kripya logout karke dobara login karein.");
          setLoading(false);
          return;
        }

        // 2. Fetch Services (First test query)
        const { data: servData, error: servErr } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', activeId);
          
        if (servErr) throw new Error("Services fetch error: " + servErr.message);
        setServices(servData || []);

        // 3. Fetch Bookings
        const { data: bookData, error: bookErr } = await supabase
          .from('service_bookings')
          .select('*')
          .eq('provider_business_id', activeId)
          .order('created_at', { ascending: false });
          
        if (bookErr) console.error("Bookings error:", bookErr.message); // Don't crash if this fails
        if (bookData) setBookings(bookData);

        // 4. Fetch Quotations
        const { data: quoteData, error: quoteErr } = await supabase
          .from('quotations')
          .select('*')
          .eq('provider_business_id', activeId);
        if (quoteData) setQuotations(quoteData);

        // 5. Fetch Expenses
        const { data: expData, error: expErr } = await supabase
          .from('expenses')
          .select('*')
          .eq('business_id', activeId);
        if (expData) setExpenses(expData);

      } catch (err: any) {
        // Agar koi bhi error aaya, toh screen par dikhao
        setErrorMsg(err.message || "Ek unknown error aaya hai.");
      } finally {
        // CHAHE ERROR AAYE YA NA AAYE, LOADER BAND HOGA
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  // --- LOADING SCREEN ---
  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-bold text-blue-600">Loading Dashboard...</p>
      </div>
    );
  }

  // --- ERROR SCREEN ---
  if (errorMsg) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center bg-red-50 p-6 rounded-2xl border border-red-200 text-center">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold text-red-800 mb-2">Oops! Kuch galat ho gaya.</h2>
        <p className="text-red-600 font-medium max-w-md">{errorMsg}</p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-xl font-bold">Try Again</button>
      </div>
    );
  }

  // --- DATA CALCULATIONS ---
  const getServicePrice = (serviceId: string) => {
    const s = services.find((x: any) => x.id === serviceId);
    return s ? s.price : 0;
  };

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const pendingQuotes = quotations.filter(q => q.status === 'pending').length;
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalEarnings = completedBookings.reduce((acc, curr) => acc + getServicePrice(curr.service_id), 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalEarnings - totalExpenses;
  const recentBookings = bookings.slice(0, 5);

  // --- MAIN DASHBOARD ---
  return (
    <div className="space-y-6">
      
      {/* WELCOME BANNER */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-lg relative overflow-hidden">
        <div className="relative z-10 mb-6 md:mb-0">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome Back, Provider! 👋</h2>
          <p className="text-blue-200 mb-4 max-w-md">Aapki aaj ki kamai aur business ka overview yahan dekhein.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/provider/bookings" className="bg-blue-500 hover:bg-blue-600 px-5 py-2.5 rounded-lg font-bold text-sm transition">View Bookings</Link>
            <Link href="/provider/sales" className="bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg font-bold text-sm transition">New Sale / Bill</Link>
          </div>
        </div>
        <div className="text-6xl relative z-10 hidden md:block">📈</div>
      </div>

      {/* STATS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/provider/bookings" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-3">📦</div>
          <p className="text-sm text-gray-500 font-semibold mb-1">Total Bookings</p>
          <h3 className="text-2xl font-bold text-gray-800">{totalBookings}</h3>
        </Link>
        <Link href="/provider/bookings" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center text-xl mb-3">⏳</div>
          <p className="text-sm text-gray-500 font-semibold mb-1">Pending Jobs</p>
          <h3 className="text-2xl font-bold text-gray-800">{pendingBookings}</h3>
        </Link>
        <Link href="/provider/quotations" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl mb-3">📄</div>
          <p className="text-sm text-gray-500 font-semibold mb-1">New Quotes</p>
          <h3 className="text-2xl font-bold text-gray-800">{pendingQuotes}</h3>
        </Link>
        <Link href="/provider/earnings" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl mb-3">💰</div>
          <p className="text-sm text-gray-500 font-semibold mb-1">Total Earnings</p>
          <h3 className="text-2xl font-bold text-green-600">₹{totalEarnings}</h3>
        </Link>
      </div>

      {/* PROFIT & LOSS */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/provider/expenses" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-xl">💸</div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Total Expenses</p>
            <h3 className="text-xl font-bold text-gray-800">₹{totalExpenses}</h3>
          </div>
        </Link>
        <div className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${netProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {netProfit >= 0 ? '📈' : '📉'}
          </div>
          <div>
            <p className={`text-xs font-bold uppercase ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Profit</p>
            <h3 className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{netProfit}</h3>
          </div>
        </div>
      </div>

      {/* RECENT BOOKINGS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Recent Bookings</h2>
          <Link href="/provider/bookings" className="text-xs font-bold text-blue-600">View All →</Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="text-center py-8"><p className="text-gray-500 text-sm">Abhi tak koi booking nahi aayi.</p></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentBookings.map(b => (
              <div key={b.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{b.customer_name}</h4>
                  <p className="text-xs text-gray-500">{new Date(b.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${
                  b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                  b.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 
                  b.status === 'completed' ? 'bg-green-100 text-green-700' : 
                  'bg-red-100 text-red-700'
                }`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}