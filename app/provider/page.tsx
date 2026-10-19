'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type ProviderProfile = {
  id: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  city: string | null;
}

export default function ProviderDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  
  const [requests, setRequests] = useState<any[]>([])
  const [amounts, setAmounts] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    loadProviderData()
  }, [])

  async function loadProviderData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    // Abhi ke liye hum business table use kar rahe hain provider profile ke liye
    const activeId = getCurrentBusinessId()
    if (!activeId) return setLoading(false)

    const { data: bizData } = await supabase.from('businesses').select('*').eq('id', activeId).single()
    if (bizData) setProfile(bizData)

    // Quotations table se nayi requests fetch karna
    const { data: quoteData } = await supabase
      .from('quotations')
      .select('*, customers(name, phone)')
      .eq('business_id', activeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (quoteData) setRequests(quoteData)
    
    setLoading(false)
  }

  // Quote (Estimate) bhejne ka function
  async function handleSendQuote(id: string) {
    const amount = amounts[id]
    if (!amount || isNaN(Number(amount))) {
      alert('Sahi amount daalein')
      return
    }

    const { error } = await supabase
      .from('quotations')
      .update({ estimated_amount: Number(amount), status: 'quoted' })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Estimate successfully bhej diya gaya!')
      setRequests(requests.filter(req => req.id !== id)) // List se hata do
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="animate-pulse text-indigo-600 font-bold">Loading Provider Dashboard...</p></div>
  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans relative">
      
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="text-3xl font-extrabold text-indigo-600 italic tracking-tighter">V</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">VyapaarSetu</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-wide">Service Provider</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => alert('Notifications coming soon')} className="relative"><span className="text-xl">🔔</span></button>
          <button onClick={() => router.push('/login')} className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center">👤</button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-5 max-w-md mx-auto">
        
        {/* Profile & Status Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3 items-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-3xl shrink-0">👨‍🔧</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-base truncate">{profile?.owner_name || 'Provider Name'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">📍 {profile?.city || 'Location'}</p>
          </div>
          
          {/* Online/Offline Toggle */}
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
          >
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </button>
        </div>

        {/* Earnings Overview */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-4 shadow-md text-white">
              <p className="text-xs font-medium text-indigo-100 mb-1">Today's Earnings</p>
              <p className="text-xl font-black">₹0</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 shadow-md text-white">
              <p className="text-xs font-medium text-purple-100 mb-1">Jobs Completed</p>
              <p className="text-xl font-black">0</p>
            </div>
          </div>
        </section>

        {/* New Requests (Bookings) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">New Requests</h2>
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-md">{requests.length} Pending</span>
          </div>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="text-3xl mb-2">☕</p>
                <p className="text-sm font-bold text-gray-800">No New Requests</p>
                <p className="text-xs text-gray-500 mt-1">Aap abhi free hain. Naye kaam ka intezar karein.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{req.customers?.name || 'Customer'}</p>
                      <p className="text-[10px] text-gray-500">{new Date(req.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-100 text-blue-700">New Request</span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg my-3 border border-gray-100">
                    <p className="text-sm text-gray-800 font-medium">"{req.description}"</p>
                  </div>

                  {/* Send Quote Input */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-600">₹</span>
                    <input 
                      type="number" 
                      placeholder="Enter Estimate" 
                      value={amounts[req.id] || ''}
                      onChange={(e) => setAmounts({...amounts, [req.id]: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                      onClick={() => handleSendQuote(req.id)}
                      className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-lg active:scale-95 transition"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>

      {/* Provider Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-2 pb-6 px-1 z-20">
        <Link href="/provider" className="flex flex-col items-center gap-1 text-indigo-600">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/provider/jobs" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600">
          <span className="text-xl">📋</span>
          <span className="text-[10px] font-medium">My Jobs</span>
        </Link>
        <Link href="/provider/earnings" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600">
          <span className="text-xl">💰</span>
          <span className="text-[10px] font-medium">Earnings</span>
        </Link>
        <Link href="/provider/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-600">
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
      </nav>

    </main>
  )
}