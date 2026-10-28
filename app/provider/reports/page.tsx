'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function ProviderReportsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month'); // today, week, month, all

  // Data States
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data: bData } = await supabase.from('service_bookings').select('*').eq('provider_business_id', activeId);
    const { data: sData } = await supabase.from('services').select('*').eq('business_id', activeId);
    const { data: eData } = await supabase.from('expenses').select('*').eq('business_id', activeId);

    if (bData) setBookings(bData);
    if (sData) setServices(sData);
    if (eData) setExpenses(eData);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- FILTER LOGIC (Simple for now) ---
  // Note: Future me hum date ke hisaab se filter karenge, abhi ke liye saara data dikha rahe hain
  const filteredBookings = bookings;

  // --- CALCULATIONS ---
  const totalJobs = filteredBookings.length;
  const completedJobs = filteredBookings.filter(b => b.status === 'completed').length;
  const pendingJobs = filteredBookings.filter(b => b.status === 'pending').length;
  const acceptedJobs = filteredBookings.filter(b => b.status === 'accepted').length;
  
  // Revenue & Expenses
  const totalRevenue = filteredBookings
    .filter(b => b.status === 'completed')
    .reduce((acc, curr) => {
      const service = services.find(s => s.id === curr.service_id);
      return acc + (service?.price || 0);
    }, 0);
    
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRevenue - totalExpense;

  // Service Performance (Kaunsi service kitni baar book hui)
  const serviceStats = services.map(service => {
    const count = filteredBookings.filter(b => b.service_id === service.id).length;
    return { name: service.name, count, price: service.price };
  }).sort((a, b) => b.count - a.count).slice(0, 4); // Top 4 services

  const maxServiceCount = Math.max(...serviceStats.map(s => s.count), 1); // For bar height

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Reports...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Business performance at a glance</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {['today', 'week', 'month', 'all'].map((filter) => (
            <button 
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition ${dateFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {filter === 'all' ? 'All Time' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900 to-indigo-800 p-6 rounded-2xl shadow-lg text-white">
          <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Total Revenue</p>
          <h3 className="text-3xl font-black">₹{totalRevenue}</h3>
          <p className="text-sm text-blue-300 mt-2">From {completedJobs} completed jobs</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl">💰</div>
            <p className="text-sm text-gray-500 font-bold">Net Profit</p>
          </div>
          <h3 className="text-3xl font-black text-gray-800">₹{netProfit}</h3>
          <p className="text-xs text-gray-400 mt-1">Revenue - Expenses (₹{totalExpense})</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl">📦</div>
            <p className="text-sm text-gray-500 font-bold">Total Bookings</p>
          </div>
          <h3 className="text-3xl font-black text-gray-800">{totalJobs}</h3>
          <p className="text-xs text-gray-400 mt-1">{completedJobs} Completed | {pendingJobs} Pending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. JOB STATUS CHART (Donut Chart using SVG) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-800 mb-6 w-full text-left border-b pb-2">Job Status Overview</h2>
          
          <div className="relative w-48 h-48">
            {/* SVG Donut Chart */}
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {/* Background Circle */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="15" />
              
              {/* Completed Jobs (Green) */}
              {totalJobs > 0 && (
                <circle 
                  cx="50" cy="50" r="40" fill="transparent" stroke="#22c55e" strokeWidth="15"
                  strokeDasharray={`${(completedJobs / totalJobs) * 251.2} 251.2`}
                />
              )}
              
              {/* Accepted Jobs (Blue) */}
              {totalJobs > 0 && (
                <circle 
                  cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="15"
                  strokeDasharray={`${(acceptedJobs / totalJobs) * 251.2} 251.2`}
                  strokeDashoffset={`-${(completedJobs / totalJobs) * 251.2}`}
                />
              )}

              {/* Pending Jobs (Yellow) */}
              {totalJobs > 0 && (
                <circle 
                  cx="50" cy="50" r="40" fill="transparent" stroke="#eab308" strokeWidth="15"
                  strokeDasharray={`${(pendingJobs / totalJobs) * 251.2} 251.2`}
                  strokeDashoffset={`-${((completedJobs + acceptedJobs) / totalJobs) * 251.2}`}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-800">{totalJobs}</span>
              <span className="text-xs text-gray-500 font-bold uppercase">Total Jobs</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6 text-xs font-bold text-gray-600 w-full">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Completed ({completedJobs})</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Active ({acceptedJobs})</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Pending ({pendingJobs})</div>
          </div>
        </div>

        {/* 2. SERVICE PERFORMANCE (Bar Chart using CSS) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Top Services</h2>
          
          {serviceStats.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No service data available.</p>
          ) : (
            <div className="space-y-5">
              {serviceStats.map((stat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-gray-700">{stat.name}</span>
                    <span className="font-bold text-gray-500">{stat.count} bookings</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        idx === 0 ? 'bg-indigo-600' : 
                        idx === 1 ? 'bg-blue-500' : 
                        idx === 2 ? 'bg-purple-500' : 'bg-pink-500'
                      }`} 
                      style={{ width: `${(stat.count / maxServiceCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-800 font-medium">
              💡 <b>Tip:</b> Jis service ki demand sabse zyada hai, aap uske rate thode badha sakte hain ya uske liye naya worker hire kar sakte hain.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}