'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function OwnerQuotationsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Har request ke liye alag amount input track karne ke liye state
  const [amounts, setAmounts] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchQuotations()
  }, [])

  async function fetchQuotations() {
    setLoading(true)
    const activeId = getCurrentBusinessId()
    if (!activeId) return setLoading(false)

    // Quotations fetch kar rahe hain (Customer ka naam bhi join karenge agar possible ho)
    const { data, error } = await supabase
      .from('quotations')
      .select('*, customers(name)')
      .eq('business_id', activeId)
      .order('created_at', { ascending: false })

    if (data) setQuotations(data)
    setLoading(false)
  }

  // Quote bhejne ka function
  async function handleSendQuote(id: string) {
    const amount = amounts[id]
    if (!amount || isNaN(Number(amount))) {
      alert('Sahi amount daalein')
      return
    }

    const { error } = await supabase
      .from('quotations')
      .update({ 
        estimated_amount: Number(amount), 
        status: 'quoted' 
      })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Quote successfully bhej diya gaya!')
      fetchQuotations() // List refresh karo
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
            <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="text-gray-500 text-xl font-bold">←</Link>
          <h1 className="text-lg font-bold text-gray-900">Quotations</h1>
        </div>
        
        {/* 🔥 YEH NAYA BUTTON HAI */}
        <Link href="/owner/quotations/create" className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm active:scale-95 transition">
          + New Quote
        </Link>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        
        {loading ? (
          <p className="text-center text-gray-500 py-10 animate-pulse">Loading requests...</p>
        ) : quotations.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm font-bold text-gray-800">Koi Request Nahi Hai</p>
            <p className="text-xs text-gray-500 mt-1">Jab customer estimate mangega, wo yahan dikhega.</p>
          </div>
        ) : (
          quotations.map((quote) => (
            <div key={quote.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{quote.customers?.name || 'Customer'}</p>
                  <p className="text-[10px] text-gray-400">{new Date(quote.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                  quote.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                  quote.status === 'quoted' ? 'bg-blue-100 text-blue-700' : 
                  quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {quote.status.toUpperCase()}
                </span>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg my-3 border border-gray-100">
                <p className="text-sm text-gray-800 font-medium">"{quote.description}"</p>
              </div>

              {/* Agar request pending hai, toh amount daalne ka option dikhao */}
              {quote.status === 'pending' ? (
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-lg font-bold text-gray-600">₹</span>
                  <input 
                    type="number" 
                    placeholder="Enter Amount" 
                    value={amounts[quote.id] || ''}
                    onChange={(e) => setAmounts({...amounts, [quote.id]: e.target.value})}
                    className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    onClick={() => handleSendQuote(quote.id)}
                    className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg active:scale-95 transition"
                  >
                    Send
                  </button>
                </div>
              ) : quote.status === 'quoted' ? (
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-sm font-bold text-blue-900">Aapka Quote:</p>
                  <p className="text-lg font-black text-blue-700">₹{quote.estimated_amount}</p>
                </div>
              ) : quote.status === 'accepted' ? (
                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-sm font-bold text-emerald-900">Customer ne Accept kiya!</p>
                  <p className="text-lg font-black text-emerald-700">₹{quote.estimated_amount}</p>
                </div>
              ) : (
                <p className="text-sm text-red-500 font-bold text-center mt-2">Customer ne Reject kar diya</p>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  )
}