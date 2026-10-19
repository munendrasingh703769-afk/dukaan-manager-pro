'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RequestQuotePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Abhi ke liye hum ek dummy business ID use kar rahe hain, 
  // baad mein hum isko "Shop Selection" se link karenge.
  // Aap apne database se kisi ek business ki ID yahan daal sakte hain test ke liye.
  const DUMMY_BUSINESS_ID = 'YOUR-BUSINESS-ID-HERE' 
  const DUMMY_CUSTOMER_ID = 'YOUR-CUSTOMER-ID-HERE'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("Please login first")
      router.push('/login')
      return
    }

    // Quotation request submit karna
    const { error } = await supabase.from('quotations').insert({
      business_id: DUMMY_BUSINESS_ID, // Baad mein dynamic hoga
      customer_id: DUMMY_CUSTOMER_ID, // Baad mein user.id se link hoga
      description: description,
      status: 'pending'
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      alert("Quotation Request sent successfully! Owner will reply soon.")
      router.push('/customer')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3 shadow-sm">
        <Link href="/customer" className="text-gray-500 text-xl font-bold">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Request Quotation (Estimate)</h1>
      </header>

      <div className="p-4 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          
          <div className="text-center mb-4">
            <span className="text-4xl">📝</span>
            <h2 className="text-lg font-bold text-gray-900 mt-2">Kaam ka Estimate mangwayein</h2>
            <p className="text-xs text-gray-500">Apni problem detail mein likhein, dukaandaar aapko rate bhejenge.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Problem / Kaam ka Vivaran</label>
            <textarea 
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jaise: Mere ghar ka AC thik karwana hai, ya 2 kamre ki painting karwani hai..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Photo (Optional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50">
              <span className="text-2xl text-gray-400">📸</span>
              <p className="text-xs text-gray-500 mt-1">Photo upload coming soon</p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition disabled:opacity-50"
          >
            {loading ? 'Bhej rahe hain...' : 'Request Estimate'}
          </button>
        </form>

        {/* Purani Quotations ki list (Placeholder) */}
        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Meri Quotation Requests</h3>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
            <p className="text-sm text-gray-400">Abhi tak koi request nahi bheji hai.</p>
          </div>
        </div>
      </div>
    </main>
  )
}