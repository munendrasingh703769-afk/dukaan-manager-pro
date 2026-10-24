'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Member = {
  id: string
  user_id: string
  role: string
  status: string
  permissions: any
  email?: string
  full_name?: string
}

type Invite = {
  id: string
  email: string
  role: string
  token: string
  expires_at: string
  created_at: string
}

export default function WorkersPage() {
  const supabase = createClient()

  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('staff')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const businessId = getCurrentBusinessId()
    if (!businessId) {
      setError('Business not found')
      setLoading(false)
      return
    }

    try {
      // 1. Fetch Members
      const { data: membersData, error: memErr } = await supabase
        .from('business_members')
        .select('*, profiles:user_id(*)')
        .eq('business_id', businessId)

      if (memErr) throw memErr

      // Format members
      if (membersData) {
        const formattedMembers = membersData.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          status: m.status || 'active',
          permissions: m.permissions,
          email: m.profiles?.email || 'No email',
          full_name: m.profiles?.full_name || 'No name',
        }))
        setMembers(formattedMembers)
      }

      // 2. Fetch Pending Invites
      const { data: inviteData } = await supabase
        .from('business_invites')
        .select('*')
        .eq('business_id', businessId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (inviteData) setInvites(inviteData)

    } catch (err: any) {
      setError(err.message || 'Failed to load workers')
    } finally {
      setLoading(false)
    }
  }

  async function inviteWorker(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const businessId = getCurrentBusinessId()
      if (!businessId) throw new Error('No business selected')

      // Check if already invited or member
      const isAlreadyMember = members.some(m => m.email?.toLowerCase() === newEmail.toLowerCase())
      if (isAlreadyMember) throw new Error('User is already a team member')

      const { data, error: invErr } = await supabase
        .from('business_invites')
        .insert({
          business_id: businessId,
          email: newEmail.toLowerCase(),
          role: newRole,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single()

      if (invErr) throw invErr

      setInvites([...invites, data])
      setNewEmail('')
      setMessage('Invite sent successfully!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function cancelInvite(id: string) {
    if (!confirm('Cancel this invite?')) return
    const { error: delErr } = await supabase.from('business_invites').delete().eq('id', id)
    if (!delErr) setInvites(invites.filter(i => i.id !== id))
  }

  async function removeWorker(memberId: string, role: string) {
    if (role === 'owner') {
      alert('Owner ko remove nahi kar sakte!')
      return
    }
    if (!confirm('Remove this worker?')) return

    const { error: delErr } = await supabase.from('business_members').delete().eq('id', memberId)
    if (!delErr) setMembers(members.filter(m => m.id !== memberId))
  }

  if (loading) {
    return <main className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></main>
  }
  return (
    <main className="p-4 max-w-md mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          👥 Workers & Permissions
        </h1>
        <Link href="/settings" className="text-blue-600 text-sm font-medium">
          ← Back
        </Link>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      {/* Invite Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">Invite New Worker</h2>
        <form onSubmit={inviteWorker} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="worker@example.com"
              className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select 
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-blue-500 bg-white"
            >
              <option value="manager">Manager (Full Access)</option>
              <option value="staff">Staff (Billing & Sales)</option>
              <option value="viewer">Viewer (Read Only)</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* Active Members List */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Active Members</h2>
        <div className="space-y-3">
          {members.map((w) => (
            <div key={w.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-xl bg-white shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {w.full_name} {w.role === 'owner' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">You</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">{w.email}</p>
                <div className="text-[10px] text-gray-500 mt-1 capitalize font-medium">
                  Role: {w.role} • Status: {w.status || 'Active'}
                </div>
              </div>
              {w.role !== 'owner' && (
                <button 
                  onClick={() => removeWorker(w.id, w.role)}
                  className="rounded-lg bg-red-50 text-red-600 px-3 py-1.5 text-xs font-bold hover:bg-red-100"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">⏳ Pending Invites ({invites.length})</h2>
          <div className="space-y-3">
            {invites.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center p-3 border border-yellow-200 rounded-xl bg-yellow-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{inv.email}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    Role: {inv.role} • Expires: {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={() => cancelInvite(inv.id)}
                  className="rounded-lg bg-white border border-red-200 text-red-600 px-3 py-1.5 text-xs font-bold hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}