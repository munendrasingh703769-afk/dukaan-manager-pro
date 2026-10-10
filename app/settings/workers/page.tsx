'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bizId } from '@/lib/business'

type Worker = {
  id: string
  user_id: string
  role: string
  status: string
  permissions: any
  email?: string
}

type Invite = {
  id: string
  email: string
  role: string
  token: string
  status: string
  expires_at: string
  created_at: string
}

export default function WorkersPage() {
  const supabase = createClient()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('worker')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null)
  const [permForm, setPermForm] = useState<any>({})

  async function loadData() {
    setLoading(true)
    setError('')
    const bid = bizId()

    if (!bid) {
      setError('Business not found')
      setLoading(false)
      return
    }

    // Workers
    const { data: members, error: mErr } = await supabase
      .from('business_members')
      .select('id, user_id, role, status, permissions')
      .eq('business_id', bid)

    if (mErr) {
      setError(mErr.message)
      setLoading(false)
      return
    }

    // Get emails from profiles
    const userIds = (members ?? []).map((m: any) => m.user_id)
    let profileMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds)
      ;(profiles ?? []).forEach((p: any) => {
        profileMap[p.id] = p.full_name || p.phone || 'Unknown'
      })
    }

    setWorkers(
      (members ?? []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        permissions: m.permissions,
        email: profileMap[m.user_id] || 'Unknown',
      }))
    )

    // Pending Invites
    const { data: invs } = await supabase
      .from('business_invites')
      .select('*')
      .eq('business_id', bid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setInvites((invs ?? []) as Invite[])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function createInvite() {
    setError('')
    setInviteLink('')

    if (!inviteEmail.trim()) {
      setError('Email daalein')
      return
    }

    const bid = bizId()
    if (!bid) {
      setError('Business not found')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Login required')
      return
    }

    setInviting(true)

    // Random token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    const { data, error: iErr } = await supabase
      .from('business_invites')
      .insert({
        business_id: bid,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        token,
        invited_by: user.id,
        status: 'pending',
      })
      .select('token')
      .single()

    if (iErr) {
      setError(iErr.message)
      setInviting(false)
      return
    }

    const link = `${window.location.origin}/signup?invite=${data.token}`
    setInviteLink(link)
    setInviting(false)
    setInviteEmail('')
    await loadData()
  }

  async function cancelInvite(id: string) {
    if (!confirm('Invite cancel karein?')) return
    await supabase.from('business_invites').delete().eq('id', id)
    await loadData()
  }

  async function removeWorker(memberId: string, role: string) {
    if (role === 'owner') {
      alert('Owner ko remove nahi kar sakte')
      return
    }
    if (!confirm('Worker ko remove karein?')) return
    await supabase.from('business_members').delete().eq('id', memberId)
    await loadData()
  }

  function openPermissions(w: Worker) {
    setEditingWorkerId(w.id)
    const p = w.permissions || {}
    setPermForm({
      sales_view: p.sales_view ?? true,
      sales_create: p.sales_create ?? true,
      sales_edit: p.sales_edit ?? false,
      sales_delete: p.sales_delete ?? false,
      purchase_view: p.purchase_view ?? false,
      purchase_create: p.purchase_create ?? false,
      purchase_edit: p.purchase_edit ?? false,
      purchase_delete: p.purchase_delete ?? false,
      products_view: p.products_view ?? true,
      products_create: p.products_create ?? false,
      products_edit: p.products_edit ?? false,
      products_delete: p.products_delete ?? false,
      customers_view: p.customers_view ?? true,
      customers_create: p.customers_create ?? true,
      customers_edit: p.customers_edit ?? false,
      customers_delete: p.customers_delete ?? false,
      reports_view: p.reports_view ?? false,
      settings_view: p.settings_view ?? false,
      settings_edit: p.settings_edit ?? false,
    })
  }

  async function savePermissions() {
    if (!editingWorkerId) return
    const { error: pErr } = await supabase
      .from('business_members')
      .update({ permissions: permForm })
      .eq('id', editingWorkerId)

    if (pErr) {
      alert(pErr.message)
      return
    }
    setEditingWorkerId(null)
    setPermForm({})
    await loadData()
    alert('Permissions saved!')
  }

  if (loading) {
    return <main className="p-4">Loading...</main>
  }

  return (
    <main className="p-4 bg-gray-100 min-h-screen">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">👥 Workers</h1>
          <Link href="/settings/business" className="text-sm text-blue-600">← Settings</Link>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-white border p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-gray-900">Team Members</h2>
            <button
              type="button"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              {showInviteForm ? 'Cancel' : '+ Add Worker'}
            </button>
          </div>

          {showInviteForm && (
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="space-y-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded border p-2 text-sm"
                  placeholder="worker@example.com"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded border p-2 text-sm"
                >
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                  <option value="ca">CA / Accountant</option>
                </select>
                <button
                  type="button"
                  disabled={inviting}
                  onClick={createInvite}
                  className="w-full rounded bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {inviting ? 'Creating...' : 'Create Invite Link'}
                </button>
              </div>

              {inviteLink && (
                <div className="mt-3 rounded bg-white border p-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    ✅ Invite Link (worker ko bhejein):
                  </div>
                  <div className="text-xs break-all font-mono text-blue-700">
                    {inviteLink}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink)
                      alert('Link copied!')
                    }}
                    className="mt-2 rounded bg-gray-800 px-3 py-1 text-xs text-white"
                  >
                    📋 Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Dukaan Manager Pro me aapko invite kiya gaya hai!\\n\\nSignup karein: ${inviteLink}`
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                    }}
                    className="mt-2 ml-2 rounded bg-green-600 px-3 py-1 text-xs text-white"
                  >
                    📱 WhatsApp
                  </button>
                </div>
              )}
            </div>
          )}

          {workers.length === 0 ? (
            <p className="text-sm text-gray-500">Koi worker nahi hai.</p>
          ) : (
            <div className="space-y-2">
              {workers.map((w) => (
                <div key={w.id} className="flex justify-between items-center rounded border p-3 bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{w.email}</div>
                    <div className="text-xs text-gray-500">
                      Role: {w.role} • Status: {w.status}
                    </div>
                  </div>
                  {w.role !== 'owner' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openPermissions(w)}
                        className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                      >
                        ⚙ Permissions
                      </button>
                      <button
                        type="button"
                        onClick={() => removeWorker(w.id, w.role)}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPermissions(w)}
                      className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                    >
                      ⚙ View Permissions
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {invites.length > 0 && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-300 p-4">
            <h2 className="text-base font-bold text-yellow-800 mb-3">
              ⏳ Pending Invites ({invites.length})
            </h2>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center rounded border border-yellow-200 bg-white p-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{inv.email}</div>
                    <div className="text-xs text-gray-500">
                      Role: {inv.role} • Expires: {new Date(inv.expires_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelInvite(inv.id)}
                    className="rounded bg-red-600 px-3 py-1 text-xs text-white"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {editingWorkerId && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 pt-8 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-lg mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold">⚙ Permissions</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWorkerId(null)
                    setPermForm({})
                  }}
                  className="text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'sales', label: '📊 Sales', actions: ['view', 'create', 'edit', 'delete'] },
                  { key: 'purchase', label: '🛒 Purchase', actions: ['view', 'create', 'edit', 'delete'] },
                  { key: 'products', label: '📦 Products', actions: ['view', 'create', 'edit', 'delete'] },
                  { key: 'customers', label: '👥 Customers', actions: ['view', 'create', 'edit', 'delete'] },
                  { key: 'reports', label: '📈 Reports', actions: ['view'] },
                  { key: 'settings', label: '⚙ Settings', actions: ['view', 'edit'] },
                ].map((mod) => (
                  <div key={mod.key} className="rounded-lg border p-3">
                    <div className="font-semibold text-gray-900 mb-2">
                      {mod.label}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {mod.actions.map((action) => {
                        const fieldKey = `${mod.key}_${action}`
                        return (
                          <label
                            key={fieldKey}
                            className="flex items-center gap-1.5 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={permForm[fieldKey] ?? false}
                              onChange={(e) =>
                                setPermForm({
                                  ...permForm,
                                  [fieldKey]: e.target.checked,
                                })
                              }
                              className="rounded"
                            />
                            <span className="capitalize">{action}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={savePermissions}
                  className="flex-1 rounded bg-green-600 px-4 py-2 text-white font-medium"
                >
                  Save Permissions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWorkerId(null)
                    setPermForm({})
                  }}
                  className="rounded bg-gray-300 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
