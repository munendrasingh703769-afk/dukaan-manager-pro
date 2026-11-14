'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminUsersPage() {
  const supabase = createClient()
  
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Manual Activation Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [planName, setPlanName] = useState('Pro')
  const [expiryDays, setExpiryDays] = useState(365)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

        async function fetchUsers() {
    setLoading(true)
    // created_at hata diya hai taaki koi column error na aaye
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      
    if (error) {
      console.error("Supabase Error:", error)
      alert("Database Error: " + error.message) // Agar koi error hoga toh screen par dikhega
    } else {
      console.log("Fetched Data:", data)
      setUsers(data || [])
    }
    setLoading(false)
  }

  async function handleActivatePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)

    // Calculate expiry date
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + expiryDays)

    const { error } = await supabase
      .from('profiles')
      .update({ 
        plan_name: planName,
        plan_expiry_date: expiryDate.toISOString()
      })
      .eq('id', selectedUser.id)

    if (error) {
      alert("Error: " + error.message)
    } else {
      alert(`Plan ${planName} activated for ${selectedUser.full_name} until ${expiryDate.toLocaleDateString()}`)
      setSelectedUser(null)
      fetchUsers() // Refresh list
    }
    setSaving(false)
  }

  const filteredUsers = users.filter((u: any) => 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.user_type || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User & Subscription Manager</h1>
          <p className="text-sm text-gray-500">View all registered users and manage their plans.</p>
        </div>

        {/* Search */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm mb-6 max-w-md">
          <input 
            type="text" 
            placeholder="Search by name, email or role..." 
            className="w-full px-3 py-2 text-sm outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="p-4 font-medium">User Details</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Current Plan</th>
                  <th className="p-4 font-medium">Expiry Date</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No users found.</td></tr>
                ) : (
                  filteredUsers.map((u: any) => {
                    const isExpired = u.plan_expiry_date ? new Date(u.plan_expiry_date) < new Date() : true;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{u.full_name || 'No Name'}</p>
                          <p className="text-xs text-gray-500">{u.email ? u.email : (u.user_type === 'admin' ? 'Admin Account' : 'No Email')}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                            {u.user_type || 'user'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            u.plan_name === 'Free' || !u.plan_name ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {u.plan_name || 'Free'}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.plan_expiry_date ? (
                            <span className={`text-sm ${isExpired ? 'text-red-600 font-bold' : 'text-green-600 font-medium'}`}>
                              {new Date(u.plan_expiry_date).toLocaleDateString()}
                              {isExpired && ' (Expired)'}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setSelectedUser(u)}
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition"
                          >
                            Activate Plan
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Activation Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Activate Plan</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleActivatePlan} className="p-5 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs text-gray-500">Activating plan for:</p>
                <p className="font-bold text-gray-800">{selectedUser.full_name}</p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={planName} 
                  onChange={(e) => setPlanName(e.target.value)}
                >
                  <option value="Basic">Basic Plan</option>
                  <option value="Pro">Pro Plan</option>
                  <option value="Premium">Premium Plan</option>
                  <option value="Enterprise">Enterprise Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={expiryDays} 
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                >
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (3 Months)</option>
                  <option value={180}>180 Days (6 Months)</option>
                  <option value={365}>365 Days (1 Year)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm disabled:opacity-50">{saving ? 'Activating...' : 'Confirm Activation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}