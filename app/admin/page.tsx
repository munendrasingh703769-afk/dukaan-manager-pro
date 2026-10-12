'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ADMIN_PASSWORD = 'Munendra@2026'

type Plan = {
  id: string
  plan_code: string
  plan_name: string
  price: number
  duration_days: number
}

type Recent = {
  id: string
  business_id: string
  business_code: string
  business_name: string
  plan_code: string | null
  status: string
  current_period_end: string | null
  amount_paid: number
  updated_at: string
}

export default function AdminPage() {
      const supabase = (createClient as any)();


  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [recent, setRecent] = useState<Recent[]>([])
  const [businessCode, setBusinessCode] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authed) loadAll()
  }, [authed])

  async function loadAll() {
    const { data: p } = await supabase
      .from('subscription_plans')
      .select('id, plan_code, plan_name, price, duration_days')
      .eq('is_active', true)
      .order('display_order')
    setPlans((p ?? []) as Plan[])
    if (p && p.length > 0 && !selectedPlan) setSelectedPlan(p[0].plan_code)

    await loadRecent()
  }

  async function loadRecent() {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, business_id, plan_code, status, current_period_end, amount_paid, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20)

    const list: Recent[] = []
    for (const s of subs ?? []) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('name, business_code')
        .eq('id', s.business_id)
        .single()
      list.push({
        id: s.id,
        business_id: s.business_id,
        business_code: biz?.business_code || '-',
        business_name: biz?.name || '-',
        plan_code: s.plan_code,
        status: s.status,
        current_period_end: s.current_period_end,
        amount_paid: Number(s.amount_paid || 0),
        updated_at: s.updated_at,
      })
    }
    setRecent(list)
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthed(true)
      setErr('')
    } else {
      setErr('Galat password')
    }
  }

  async function activatePlan() {
    setMsg('')
    setErr('')

    if (!businessCode.trim()) {
      setErr('Business code daalein')
      return
    }
    if (!selectedPlan) {
      setErr('Plan select karein')
      return
    }

    const plan = plans.find((p) => p.plan_code === selectedPlan)
    if (!plan) {
      setErr('Plan nahi mila')
      return
    }

    setSaving(true)

    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('business_code', businessCode.trim().toUpperCase())
      .single()

    if (bizErr || !biz) {
      setErr('Business code galat hai')
      setSaving(false)
      return
    }

    const now = new Date()
    const end = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000)

    const { error: updErr } = await supabase
      .from('subscriptions')
      .upsert(
        {
          business_id: biz.id,
          plan_code: plan.plan_code,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          amount_paid: plan.price,
          payment_method: 'upi',
          updated_at: now.toISOString(),
        },
        { onConflict: 'business_id' }
      )

    if (updErr) {
      setErr(updErr.message)
      setSaving(false)
      return
    }

    setMsg(`✅ ${biz.name} (${businessCode.toUpperCase()}) — ${plan.plan_name} activate ho gaya!`)
    setBusinessCode('')
    await loadRecent()
    setSaving(false)
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
          <h1 className="text-xl font-bold text-gray-900">🔒 Admin Panel</h1>
          <p className="mt-1 text-sm text-gray-600">Password daalein</p>

          {err && (
            <div className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded border p-2"
            placeholder="Admin password"
            autoFocus
          />

          <button
            type="submit"
            className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-white"
          >
            Login
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-md">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">🔒 Admin Panel</h1>
          <button
            type="button"
            onClick={() => setAuthed(false)}
            className="text-xs text-red-600"
          >
            Logout
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow">
          <h2 className="font-bold text-gray-900">Plan Activate Karein</h2>

          {msg && (
            <div className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
              {msg}
            </div>
          )}

          {err && (
            <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium">Business Code</label>
              <input
                type="text"
                value={businessCode}
                onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded border p-2 font-mono"
                placeholder="jaise: BKK5735"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.plan_code}>
                    {p.plan_name} — ₹{p.price}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={activatePlan}
              disabled={saving}
              className="w-full rounded bg-green-600 px-4 py-3 text-white font-medium disabled:opacity-50"
            >
              {saving ? 'Activating...' : '✅ Activate Plan'}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="font-bold text-gray-900 mb-3">Recent Activations</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">Koi activation nahi</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.id} className="rounded border p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold">{r.business_code}</span>
                    <span className={r.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-gray-600">{r.business_name}</div>
                  <div className="text-gray-500 mt-1">
                    {r.plan_code || '-'} • ₹{r.amount_paid}
                    {r.current_period_end && (
                      <> • till {new Date(r.current_period_end).toLocaleDateString('en-IN')}</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link href="/" className="mt-4 block text-center text-sm text-blue-600">
          ← Home
        </Link>
      </div>
    </main>
  )
}
