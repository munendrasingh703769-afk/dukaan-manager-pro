'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getCurrentBusinessId, setCurrentBusinessId, bizId } from '@/lib/business'
import { signOut } from '@/lib/auth'

let BUSINESS_ID = ''

export default function Home() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('code') && params.get('type') === 'recovery') {
      window.location.replace('/reset-password' + window.location.search)
    }
    if (params.get('code') && !params.get('type')) {
      // Supabase naya format — recovery ke liye
      window.location.replace('/reset-password' + window.location.search)
    }
  }
  if (typeof window !== 'undefined' && !BUSINESS_ID) {
    BUSINESS_ID = getCurrentBusinessId() || 'fc98ba38-bf25-4268-98ba-aad43ecfa6d3'
  }
  const [customers, setCustomers] = useState(0)
  const [products, setProducts] = useState(0)
  const [purchases, setPurchases] = useState(0)
  const [salesCount, setSalesCount] = useState(0)
  const [error, setError] = useState('')
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [trialStatus, setTrialStatus] = useState<string>('')
  const [businessCode, setBusinessCode] = useState<string>('')
  const [bizInfo, setBizInfo] = useState<any>(null)
  const [businesses, setBusinesses] = useState<Array<{id: string; name: string; business_code: string | null}>>([])
  const [currentBiz, setCurrentBiz] = useState<string>('')
  const [loadingBiz, setLoadingBiz] = useState(true)

  async function loadBusinesses() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoadingBiz(false)
      return
    }

    // Auto-accept pending invite
    const inviteToken = typeof window !== 'undefined'
      ? localStorage.getItem('invite_token')
      : null

    if (inviteToken) {
      const { data: inv } = await supabase
        .from('business_invites')
        .select('id, business_id, role')
        .eq('token', inviteToken)
        .eq('status', 'pending')
        .maybeSingle()

      if (inv) {
        const { data: existing } = await supabase
          .from('business_members')
          .select('id')
          .eq('business_id', inv.business_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!existing) {
          await supabase.from('business_members').insert({
            business_id: inv.business_id,
            user_id: user.id,
            role: inv.role,
            permissions: {},
            status: 'active',
          })
        }

        await supabase
          .from('business_invites')
          .update({ status: 'accepted' })
          .eq('id', inv.id)

        setCurrentBusinessId(inv.business_id)
      }

      localStorage.removeItem('invite_token')
    }

    const { data: members } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', user.id)

    if (!members || members.length === 0) {
      setLoadingBiz(false)
      return
    }

    const bizIds = members.map((m: any) => m.business_id)
    const { data: bizList } = await supabase
      .from('businesses')
      .select('id, name, business_code')
      .in('id', bizIds)
      .order('created_at')

    const list = bizList ?? []
    setBusinesses(list)

    const stored = getCurrentBusinessId()
    const valid = stored && list.some((b: any) => b.id === stored)
    const useId = valid ? stored : list[0]?.id || ''
    setCurrentBiz(useId)
    if (useId) setCurrentBusinessId(useId)
    BUSINESS_ID = useId

    if (useId) {
      BUSINESS_ID = useId
      await Promise.all([loadData(), loadTrial()])
    }

    setLoadingBiz(false)
  }

  async function deleteBusiness() {
    if (businesses.length <= 1) {
      alert('Kam se kam 1 business rakhna zaroori hai.')
      return
    }
    const biz = businesses.find(b => b.id === currentBiz)
    if (!biz) return
    if (!confirm(`Delete "${biz.name || 'Untitled'}"?\n\nSaara data (customers, sales, purchases, products) delete ho jayega. Ye undo nahi hoga.`)) return

    const supabase = createClient()
    const bid = currentBiz

    // Step 1: Related data delete karo (order matters for foreign keys)
    try {
      // Sub-tables (children first)
      await supabase.from('stock_movements').delete().eq('business_id', bid)
      await supabase.from('purchase_items').delete().in('purchase_id',
        (await supabase.from('purchases').select('id').eq('business_id', bid)).data?.map(p => p.id) || [])
      await supabase.from('sale_items').delete().in('sale_id',
        (await supabase.from('sales').select('id').eq('business_id', bid)).data?.map(s => s.id) || [])

      // Parent tables
      await supabase.from('purchases').delete().eq('business_id', bid)
      await supabase.from('sales').delete().eq('business_id', bid)
      await supabase.from('products').delete().eq('business_id', bid)
      await supabase.from('customers').delete().eq('business_id', bid)
      await supabase.from('suppliers').delete().eq('business_id', bid)
      await supabase.from('subscriptions').delete().eq('business_id', bid)
      await supabase.from('referrals').delete().eq('referrer_business_id', bid)
      await supabase.from('referrals').delete().eq('referee_business_id', bid)
      await supabase.from('business_members').delete().eq('business_id', bid)

      // Finally business
      const { error: err } = await supabase.from('businesses').delete().eq('id', bid)
      if (err) {
        alert('Delete failed: ' + err.message)
        return
      }
    } catch (e: any) {
      alert('Delete error: ' + (e?.message || 'unknown'))
      return
    }

    // Next business pe switch karo
    const nextBiz = businesses.find(b => b.id !== bid)
    if (nextBiz) {
      setCurrentBusinessId(nextBiz.id)
      window.location.href = '/'
    }
  }

  function switchBusiness(id: string) {
    setCurrentBiz(id)
    setCurrentBusinessId(id)
    window.location.reload()
  }

  async function loadTrial() {
    const supabase = createClient()
    const { data } = await supabase
      .from('subscriptions')
      .select('status, trial_ends_at, current_period_end, business_id')
      .eq('business_id', bizId())
      .single()

    if (!data) {
      setTrialDays(null)
      setTrialStatus('')
      return
    }

    setTrialStatus(data.status || '')

    const { data: biz } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', data.business_id)
      .single()
    if (biz) {
      setBizInfo(biz)
      if (biz.business_code) setBusinessCode(biz.business_code)
    }

    let endDate: string | null = null
    if (data.status === 'trial') endDate = data.trial_ends_at
    else if (data.status === 'active') endDate = data.current_period_end

    if (!endDate) {
      setTrialDays(null)
      return
    }

    const end = new Date(endDate).getTime()
    const now = Date.now()
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    setTrialDays(days)

    // Referral auto-bonus HATAAYA gaya (naya plan)
    // Ab bonus sirf admin dega jab payment ho
    // localStorage.removeItem('ref_code')  // Step 2 me handle hoga
  }

  async function applyReferral(refCode: string, newBusinessId: string) {
    const supabase = createClient()
    try {
      // Referrer dhundho
      const { data: referrer } = await supabase
        .from('businesses')
        .select('id, business_code')
        .eq('business_code', refCode)
        .single()

      if (!referrer) {
        localStorage.removeItem('ref_code')
        return
      }

      // Apna business check (khud ka code use na kare)
      if (referrer.id === newBusinessId) {
        localStorage.removeItem('ref_code')
        return
      }

      // Referral record banao
      const { error: refErr } = await supabase
        .from('referrals')
        .insert({
          referrer_business_id: referrer.id,
          referee_business_id: newBusinessId,
          code_used: refCode,
          bonus_days: 30,
          referrer_bonus_applied: true,
          referee_bonus_applied: true,
        })

      if (refErr) {
        console.error('Referral error:', refErr.message)
        localStorage.removeItem('ref_code')
        return
      }

      // Referrer ko 30 din bonus do
      const { data: referrerSub } = await supabase
        .from('subscriptions')
        .select('current_period_end, status')
        .eq('business_id', referrer.id)
        .single()

      if (referrerSub) {
        const currentEnd = referrerSub.current_period_end
          ? new Date(referrerSub.current_period_end)
          : new Date()
        const newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000)

        await supabase
          .from('subscriptions')
          .update({
            current_period_end: newEnd.toISOString(),
            status: referrerSub.status === 'trial' ? 'trial' : 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', referrer.id)
      }

      // Naye user ko 30 din bonus do
      const { data: newSub } = await supabase
        .from('subscriptions')
        .select('current_period_end, trial_ends_at, status')
        .eq('business_id', newBusinessId)
        .single()

      if (newSub) {
        const now = new Date()
        const baseDate = newSub.current_period_end
          ? new Date(newSub.current_period_end)
          : newSub.trial_ends_at
          ? new Date(newSub.trial_ends_at)
          : now
        const newEnd = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

        await supabase
          .from('subscriptions')
          .update({
            current_period_end: newEnd.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('business_id', newBusinessId)
      }

      localStorage.removeItem('ref_code')
      alert('🎉 Referral bonus applied! Aapko 30 din extra free mile!')
    } catch (e) {
      console.error('Referral exception:', e)
      localStorage.removeItem('ref_code')
    }
  }

  async function loadData() {
    const supabase = createClient()
    const bid = bizId()

    const [custRes, prodRes, purchRes, salesRes] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', bid),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('business_id', bid),
      supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('business_id', bid),
      supabase.from('sales').select('*', { count: 'exact', head: true }).eq('business_id', bid),
    ])

    if (custRes.error) {
      setError(custRes.error.message)
      return
    }
    if (prodRes.error) {
      setError(prodRes.error.message)
      return
    }
    if (purchRes.error) {
      setError(purchRes.error.message)
      return
    }
    if (salesRes.error) {
      setError(salesRes.error.message)
      return
    }

    setCustomers(custRes.count ?? 0)
    setProducts(prodRes.count ?? 0)
    setPurchases(purchRes.count ?? 0)
    setSalesCount(salesRes.count ?? 0)
  }

  useEffect(() => {
    loadBusinesses()
  }, [])

  if (loadingBiz) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    )
  }

  if (businesses.length === 0) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg text-center">
          <div className="text-5xl">🏪</div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Swagat hai!
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Aapka koi business nahi hai. Apna pehla business add karein — 15 din free trial milega.
          </p>
          <Link
            href="/business/new"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-medium"
          >
            + Naya Business Banayein
          </Link>
          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Logout karein?')) return
                localStorage.removeItem('current_business_id')
                await signOut()
                window.location.href = '/login'
              }}
              className="text-sm text-red-600 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-6xl">

        {businesses.length > 1 && (
          <div className="mb-4 rounded-xl bg-white border p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-gray-600 whitespace-nowrap">Business:</div>
              <select
                value={currentBiz}
                onChange={(e) => switchBusiness(e.target.value)}
                className="flex-1 rounded border p-2 text-sm font-medium"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || 'Untitled'} {b.business_code ? `(${b.business_code})` : ''}
                  </option>
                ))}
              </select>
              <Link
                href="/settings/business"
                className="whitespace-nowrap rounded-lg bg-gray-700 px-3 py-2 text-xs text-white"
              >
                ✏️ Edit
              </Link>
              <button
                type="button"
                onClick={deleteBusiness}
                className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-2 text-xs text-white"
              >
                🗑️
              </button>
                <Link
                href="/business/new"
                className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs text-white"
              >
                + Naya
              </Link>
            </div>
          </div>
        )}

        {businesses.length === 1 && (
          <div className="mb-4 text-right">
            <Link
              href="/business/new"
              className="text-xs text-blue-600 font-medium"
            >
              + Naya Business Add Karein
            </Link>
          </div>
        )}

        {bizInfo && (
          <div className="mb-4 rounded-xl bg-white border p-4 shadow-sm">
            <div className="flex justify-between items-start gap-2 mb-3">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">
                  🏪 {bizInfo.name || 'Business'}
                </h2>
                {bizInfo.tagline ? (
                  <p className="text-xs text-gray-600 mt-0.5">{bizInfo.tagline}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic mt-0.5">Tagline add karo</p>
                )}
              </div>
              <Link
                href="/settings/business"
                className="whitespace-nowrap rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white"
              >
                ✏️ Edit
              </Link>
            </div>

            <div className="space-y-1.5 text-sm">
              {bizInfo.owner_name ? (
                <div><span className="text-gray-500">👤</span> <span className="text-gray-900">{bizInfo.owner_name}</span></div>
              ) : (
                <div><span className="text-gray-500">👤</span> <span className="text-gray-400 italic text-xs">Owner name add karo</span></div>
              )}
              {bizInfo.phone ? (
                <div><span className="text-gray-500">📞</span> <span className="text-gray-900">{bizInfo.phone}</span></div>
              ) : (
                <div><span className="text-gray-500">📞</span> <span className="text-gray-400 italic text-xs">Phone add karo</span></div>
              )}
              {bizInfo.email ? (
                <div><span className="text-gray-500">📧</span> <span className="text-gray-900">{bizInfo.email}</span></div>
              ) : (
                <div><span className="text-gray-500">📧</span> <span className="text-gray-400 italic text-xs">Email add karo</span></div>
              )}
              {bizInfo.address || bizInfo.city || bizInfo.state || bizInfo.pincode ? (
                <div>
                  <span className="text-gray-500">📍</span>{' '}
                  <span className="text-gray-900">
                    {[bizInfo.address, bizInfo.city, bizInfo.state, bizInfo.pincode].filter(Boolean).join(', ')}
                  </span>
                </div>
              ) : (
                <div><span className="text-gray-500">📍</span> <span className="text-gray-400 italic text-xs">Address add karo</span></div>
              )}
              {bizInfo.gst_number ? (
                <div><span className="text-gray-500">🧾 GST:</span> <span className="text-gray-900 font-mono">{bizInfo.gst_number}</span></div>
              ) : (
                <div><span className="text-gray-500">🧾 GST:</span> <span className="text-gray-400 italic text-xs">GST number add karo</span></div>
              )}
              {bizInfo.pan_number ? (
                <div><span className="text-gray-500">PAN:</span> <span className="text-gray-900 font-mono">{bizInfo.pan_number}</span></div>
              ) : (
                <div><span className="text-gray-500">PAN:</span> <span className="text-gray-400 italic text-xs">PAN add karo</span></div>
              )}
              {bizInfo.bank_name ? (
                <div>
                  <span className="text-gray-500">🏦</span>{' '}
                  <span className="text-gray-900">{bizInfo.bank_name}{bizInfo.bank_branch ? ' • ' + bizInfo.bank_branch : ''}</span>
                </div>
              ) : (
                <div><span className="text-gray-500">🏦</span> <span className="text-gray-400 italic text-xs">Bank details add karo</span></div>
              )}
              {bizInfo.bank_account && (
                <div><span className="text-gray-500">A/C:</span> <span className="text-gray-900 font-mono">{bizInfo.bank_account}</span></div>
              )}
              {bizInfo.ifsc_code && (
                <div><span className="text-gray-500">IFSC:</span> <span className="text-gray-900 font-mono">{bizInfo.ifsc_code}</span></div>
              )}
              {bizInfo.upi_id && (
                <div><span className="text-gray-500">UPI:</span> <span className="text-gray-900 font-mono">{bizInfo.upi_id}</span></div>
              )}
            </div>
          </div>
        )}

        {trialDays !== null && trialStatus === 'trial' && (
          <div className={`mb-4 rounded-xl p-3 ${trialDays <= 3 ? 'bg-red-50 border border-red-300' : trialDays <= 7 ? 'bg-yellow-50 border border-yellow-300' : 'bg-blue-50 border border-blue-300'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className={`text-sm font-bold ${trialDays <= 3 ? 'text-red-700' : trialDays <= 7 ? 'text-yellow-700' : 'text-blue-700'}`}>
                  {trialDays > 0 ? `Trial: ${trialDays} din baaki` : 'Trial khatam ho gaya'}
                </div>
                <div className="text-xs mt-1 text-gray-600">
                  {trialDays <= 3 ? 'Aaj hi upgrade karein, warna sab kuch band ho jayega' : 'Free trial chal raha hai — poore features ka maza lein'}
                </div>
              </div>
              <Link
                href="/pricing"
                className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
              >
                Upgrade
              </Link>
            </div>
          </div>
        )}

        {trialDays !== null && trialStatus === 'active' && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-300 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-green-700">
                  Plan Active ✅
                </div>
                <div className="text-xs mt-1 text-gray-600">
                  {trialDays > 0 ? `${trialDays} din me renew hoga` : 'Aaj renew karein'}
                </div>
              </div>
              <Link href="/pricing" className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white">
                Renew
              </Link>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Link
                href="/reports"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow"
              >
                📊 Reports
              </Link>
              <Link
                href="/settings"
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white shadow"
              >
                ⚙ Settings
              </Link>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Dukaan Manager Pro
            </h1>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Business Management Dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">

          <Link
            href="/customers"
            className="rounded-xl bg-white p-4 shadow transition hover:shadow-md"
          >
            <p className="text-sm text-gray-500">
              Customers
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {customers}
            </p>

            <p className="mt-2 text-sm text-blue-600">
              Open Customers →
            </p>
          </Link>

          <Link
            href="/products"
            className="rounded-xl bg-white p-4 shadow transition hover:shadow-md"
          >
            <p className="text-sm text-gray-500">
              Products & Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {products}
            </p>

            <p className="mt-2 text-sm text-blue-600">
              Open Products →
            </p>
          </Link>

          <Link
            href="/purchases"
            className="rounded-xl bg-white p-4 shadow transition hover:shadow-md"
          >
            <p className="text-sm text-gray-500">
              Purchases
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {purchases}
            </p>

            <p className="mt-2 text-sm text-blue-600">
              Open Purchases →
            </p>
          </Link>

        <Link
          href="/sales"
          className="rounded-xl bg-white p-4 shadow transition hover:shadow-md"
        >
          <p className="text-sm font-bold text-gray-900">
            Sales
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {salesCount}
          </p>
          <p className="mt-2 text-sm text-blue-600">
            {salesCount > 0 ? 'View Sales →' : 'Make Sale →'}
          </p>
        </Link>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">
              Today's Sales
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              ₹0
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">
              Udhaar
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              ₹0
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}
