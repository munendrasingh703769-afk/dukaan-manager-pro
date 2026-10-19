'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerQuotationsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyQuotations()
  }, [])

  async function fetchMyQuotations() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data, error } = await supabase
      .from('quotations')
      .select('*, businesses(name, phone)')
      .order('created_at', { ascending: false })

    if (data) setQuotations(data)
    setLoading(false)
  }

  async function handleAction(id: string, action: 'accepted' | 'rejected') {
    if(!confirm(`Kya aap sach mein is quote ko ${action} karna chahte hain?`)) return;

    const { error } = await supabase
      .from('quotations')
      .update({ status: action })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`Quote ${action} successfully!`)
      fetchMyQuotations()
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/customer" className="text-gray-500 text-xl font-bold">←</Link>
          <h1 className="text-lg font-bold text-gray-900">My Requests & Quotes</h1>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        
        {loading ? (
          <p className="text-center text-gray-500 py-10 animate-pulse">Loading your requests...</p>
        ) : quotations.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm font-bold text-gray-800">Koi Request Nahi Hai</p>
            <Link href="/customer/request-quote" className="text-xs text-blue-600 font-bold mt-2 inline-block">Naya Estimate Mangwayein</Link>
          </div>
        ) : (
          quotations.map((quote) => (
            <div key={quote.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{quote.businesses?.name || 'Service Provider'}</p>
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
                <p className="text-xs text-gray-500 mb-1">Aapki Problem:</p>
                <p className="text-sm text-gray-800 font-medium">"{quote.description}"</p>
              </div>

              {quote.status === 'pending' && (
                <p className="text-xs text-orange-600 font-semibold text-center bg-orange-50 p-2 rounded-lg">Wait karein, provider estimate bhej rahe hain...</p>
              )}

              {quote.status === 'quoted' && (
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-bold text-gray-800">Provider ka Estimate:</p>
                    <p className="text-lg font-black text-blue-600">₹{quote.estimated_amount}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(quote.id, 'rejected')} className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded-lg border border-red-100 text-sm">Reject</button>
                    <button onClick={() => handleAction(quote.id, 'accepted')} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm shadow-md">Accept</button>
                  </div>
                </div>
              )}

              {quote.status === 'accepted' && (
                <div className="border-t border-emerald-100 pt-3 mt-3 bg-emerald-50 p-3 rounded-lg flex justify-between items-center">
                  <p className="text-sm font-bold text-emerald-800">Accepted!</p>
                  <p className="text-lg font-black text-emerald-600">₹{quote.estimated_amount}</p>
                </div>
              )}
              
              {quote.status === 'rejected' && (
                <p className="text-xs text-red-500 font-bold text-center mt-2">Aapne is quote ko reject kar diya hai.</p>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  )
}