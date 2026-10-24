'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewBusinessPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  
  // Form fields based on your exact DB schema
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return alert('Business name is required')

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('You must be logged in')
      router.push('/login')
      return
    }

    // Database schema ke hisaab se insert
    const { error } = await supabase
      .from('businesses')
      .insert({
        name: name.trim(),
        owner_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        owner_id: user.id // Link to current user
      })

    if (error) {
      alert('Error adding business: ' + error.message)
      setLoading(false)
      return
    }

    alert('Business added successfully!')
    router.push('/owner')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-slate-800">Add New Business</h1>
          <Link href="/owner" className="text-sm font-medium text-blue-600">Cancel</Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Business Name *</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-blue-500" placeholder="e.g. Shree Ram Kirana" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Owner Name</label>
            <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-blue-500" placeholder="Your Name" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-blue-500" placeholder="9876543210" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-blue-500" placeholder="e.g. Bareilly" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-blue-500" placeholder="Shop Address" />
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 mt-2">
            {loading ? 'Creating...' : 'Create Business'}
          </button>
        </form>
      </div>
    </main>
  )
}