'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function CustomersPage() {
  const supabase = createClient()
  const activeId = getCurrentBusinessId()

  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (activeId) fetchCustomers()
  }, [activeId])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', activeId)
      .order('created_at', { ascending: false })
      
    if (data) setCustomers(data)
    setLoading(false)
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Customer ka naam zaroori hai.')
    
    setSaving(true)
    setError('')
    setSuccess('')

    const { error: insertError } = await supabase.from('customers').insert({
      business_id: activeId,
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      opening_balance: Number(openingBalance) || 0,
      current_balance: Number(openingBalance) || 0 // Shuru me udhaar opening balance ke barabar hoga
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess('Customer successfully add ho gaya!')
      setName(''); setPhone(''); setAddress(''); setOpeningBalance('')
      fetchCustomers() // List refresh karo
    }
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-slate-200 flex items-center gap-3 shadow-sm">
        <Link href="/owner" className="text-slate-500 text-xl font-bold bg-slate-100 p-2 rounded-full w-9 h-9 flex items-center justify-center">←</Link>
        <h1 className="text-lg font-bold text-slate-800">Customers (Udhaar Khata)</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">
        
        {/* Add Customer Form */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <span className="bg-teal-100 text-teal-600 p-2 rounded-lg text-sm">👤</span> Add New Customer
          </h2>
          
          {error && <div className="mb-4 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</div>}
          {success && <div className="mb-4 text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg">{success}</div>}

          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Customer Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ex: Rakesh Kumar" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ex: 9876543210" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Opening Udhaar (₹)</label>
              <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="0" />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition">
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </form>
        </div>

        {/* Customer List */}
        <div>
          <h2 className="text-lg font-black text-slate-800 mb-3 px-1">All Customers ({customers.length})</h2>
          
          {loading ? (
            <p className="text-center text-slate-400 py-6 animate-pulse">Loading customers...</p>
          ) : customers.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl text-center border border-slate-200 shadow-sm">
              <span className="text-4xl block mb-2">👥</span>
              <p className="font-bold text-slate-700">Koi customer nahi hai</p>
              <p className="text-xs text-slate-500 mt-1">Upar form se naya customer add karein.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((cust) => (
                <div key={cust.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{cust.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{cust.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Udhaar</p>
                    <p className={`font-black text-sm ${Number(cust.current_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{Number(cust.current_balance || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}