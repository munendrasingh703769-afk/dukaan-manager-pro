'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminAffiliatesPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [partners, setPartners] = useState<any[]>([])
  const [stats, setStats] = useState({ clicks: 0, orders: 0, pendingCommission: 0, approvedCommission: 0 })
  
  // Form States
  const [isAdding, setIsAdding] = useState(false)
  const [newPartner, setNewPartner] = useState({ name: '', slug: '', api_ref: '' })
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => {
    fetchAdminData()
  }, [])

  async function fetchAdminData() {
    setLoading(true)
    
    // 1. Fetch Partners
    const { data: partnerData } = await supabase.from('affiliate_partners').select('*').order('created_at', { ascending: false })
    if (partnerData) setPartners(partnerData)

    // 2. Fetch Stats
    // Clicks Count
    const { count: clickCount } = await supabase.from('affiliate_clicks').select('*', { count: 'exact', head: true })
    
    // Orders & Commission
    const { data: orderData } = await supabase.from('affiliate_orders').select('commission_amount, status')
    
    let pending = 0, approved = 0, totalOrders = 0
    if (orderData) {
      totalOrders = orderData.length
      orderData.forEach(o => {
        if (o.status === 'pending') pending += Number(o.commission_amount || 0)
        if (o.status === 'approved' || o.status === 'paid') approved += Number(o.commission_amount || 0)
      })
    }

    setStats({
      clicks: clickCount || 0,
      orders: totalOrders,
      pendingCommission: pending,
      approvedCommission: approved
    })

    setLoading(false)
  }

  async function handleAddPartner(e: React.FormEvent) {
    e.preventDefault()
    setSaveLoading(true)
    
    const { error } = await supabase.from('affiliate_partners').insert({
      name: newPartner.name,
      slug: newPartner.slug.toLowerCase().replace(/\s+/g, '-'),
      api_credentials_ref: newPartner.api_ref,
      is_active: true
    })

    if (error) {
      alert("Error adding partner: " + error.message)
    } else {
      alert("Partner added successfully!")
      setIsAdding(false)
      setNewPartner({ name: '', slug: '', api_ref: '' })
      fetchAdminData() // Refresh list
    }
    setSaveLoading(false)
  }

  // ... (UI Code will come in next message)
  // ... (Part 1 ka code yahan khatam hua hoga)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Management</h1>
          <p className="text-sm text-gray-500">Manage partners, clicks, and commission reports.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          + Add New Partner
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Clicks</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.clicks}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Reported Orders</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.orders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100 bg-yellow-50/30">
          <p className="text-xs text-yellow-600 font-medium uppercase tracking-wider mb-1">Pending Commission</p>
          <p className="text-2xl font-bold text-yellow-700">₹{loading ? '...' : stats.pendingCommission.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100 bg-green-50/30">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wider mb-1">Approved Commission</p>
          <p className="text-2xl font-bold text-green-700">₹{loading ? '...' : stats.approvedCommission.toFixed(2)}</p>
        </div>
      </div>

      {/* Partners List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Connected Partners</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-medium">Partner Name</th>
                <th className="p-4 font-medium">Slug</th>
                <th className="p-4 font-medium">API Status</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading partners...</td></tr>
              ) : partners.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No partners added yet.</td></tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-900">{p.name}</td>
                    <td className="p-4 text-sm text-gray-500">{p.slug}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${p.api_status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {p.api_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${p.is_active ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Partner Modal (Popup) */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Add New Partner</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleAddPartner} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Amazon India"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({...newPartner, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner Slug (Unique)</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. amazon"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newPartner.slug}
                  onChange={(e) => setNewPartner({...newPartner, slug: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vault Secret ID (API Key)</label>
                <input 
                  type="text" 
                  placeholder="e.g. vault_amazon_123"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newPartner.api_ref}
                  onChange={(e) => setNewPartner({...newPartner, api_ref: e.target.value})}
                />
                <p className="text-[10px] text-gray-500 mt-1">Never paste real API keys here. Use Supabase Vault reference.</p>
              </div>
              
              <div className="pt-2 flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Save Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}