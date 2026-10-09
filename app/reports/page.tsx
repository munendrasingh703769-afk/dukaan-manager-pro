'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bizId } from '@/lib/business'

type Sale = {
  id: string
  total_amount: number
  cash_amount: number
  online_amount: number
  paid_amount: number
  due_amount: number
  sale_date: string
}

type Purchase = {
  id: string
  total_amount: number
  cash_amount: number
  online_amount: number
  paid_amount: number
  due_amount: number
  created_at: string
}

type RangeKey = 'today' | 'week' | 'month' | 'all' | 'custom'

export default function ReportsPage() {
  const supabase = createClient()

  const [sales, setSales] = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState<RangeKey>('month')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    if (range === 'custom' && fromDate && toDate) {
      loadData()
    } else if (range !== 'custom') {
      loadData()
    }
  }, [range, fromDate, toDate])

  function getDateRange(): { from: string; to: string } {
    const now = new Date()
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    let from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

    if (range === 'today') {
      // already set
    } else if (range === 'week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      from = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
    } else if (range === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    } else if (range === 'all') {
      from = new Date(2020, 0, 1, 0, 0, 0)
    } else if (range === 'custom' && fromDate && toDate) {
      from = new Date(fromDate + 'T00:00:00')
      const toD = new Date(toDate + 'T23:59:59')
      return { from: from.toISOString(), to: toD.toISOString() }
    }

    return { from: from.toISOString(), to: to.toISOString() }
  }

  async function loadData() {
    setLoading(true)
    setError('')

    const { from, to } = getDateRange()
    const bid = bizId()

    if (!bid) {
      setError('Business not found')
      setLoading(false)
      return
    }

    const [salesRes, purchRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, total_amount, cash_amount, online_amount, paid_amount, due_amount, sale_date')
        .eq('business_id', bid)
        .gte('sale_date', from)
        .lte('sale_date', to)
        .order('sale_date', { ascending: false }),
      supabase
        .from('purchases')
        .select('id, total_amount, cash_amount, online_amount, paid_amount, due_amount, created_at')
        .eq('business_id', bid)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false }),
    ])

    if (salesRes.error) {
      setError(salesRes.error.message)
      setLoading(false)
      return
    }
    if (purchRes.error) {
      setError(purchRes.error.message)
      setLoading(false)
      return
    }

    setSales((salesRes.data ?? []) as Sale[])
    setPurchases((purchRes.data ?? []) as Purchase[])
    setLoading(false)
  }

  const salesTotal = useMemo(() => sales.reduce((s, x) => s + Number(x.total_amount || 0), 0), [sales])
  const salesCash = useMemo(() => sales.reduce((s, x) => s + Number(x.cash_amount || 0), 0), [sales])
  const salesOnline = useMemo(() => sales.reduce((s, x) => s + Number(x.online_amount || 0), 0), [sales])
  const salesDue = useMemo(() => sales.reduce((s, x) => s + Number(x.due_amount || 0), 0), [sales])

  const purchTotal = useMemo(() => purchases.reduce((s, x) => s + Number(x.total_amount || 0), 0), [purchases])
  const purchCash = useMemo(() => purchases.reduce((s, x) => s + Number(x.cash_amount || 0), 0), [purchases])
  const purchOnline = useMemo(() => purchases.reduce((s, x) => s + Number(x.online_amount || 0), 0), [purchases])
  const purchDue = useMemo(() => purchases.reduce((s, x) => s + Number(x.due_amount || 0), 0), [purchases])

  const profit = salesTotal - purchTotal

  return (
    <main className="p-4 bg-gray-100 min-h-screen">
      <div className="mx-auto max-w-3xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">📊 Reports</h1>
          <Link href="/" className="text-sm text-blue-600">← Home</Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['today', 'week', 'month', 'all', 'custom'] as RangeKey[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                range === r ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              {r === 'today' ? 'Aaj' : r === 'week' ? 'Hafta' : r === 'month' ? 'Mahina' : r === 'all' ? 'Sab' : 'Custom'}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-full rounded border p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-full rounded border p-2 text-sm"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-green-50 border border-green-200 p-3">
                <div className="text-xs text-green-700 font-medium">Sales Total</div>
                <div className="text-2xl font-bold text-green-900 mt-1">₹{salesTotal.toFixed(0)}</div>
                <div className="text-xs text-green-600 mt-1">{sales.length} bills</div>
              </div>
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                <div className="text-xs text-orange-700 font-medium">Purchase Total</div>
                <div className="text-2xl font-bold text-orange-900 mt-1">₹{purchTotal.toFixed(0)}</div>
                <div className="text-xs text-orange-600 mt-1">{purchases.length} bills</div>
              </div>
            </div>

            <div className={`mb-4 rounded-xl border-2 p-4 ${profit >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="text-sm font-medium text-gray-700">Profit (Sales − Purchase)</div>
              <div className={`text-3xl font-bold mt-1 ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ₹{profit.toFixed(0)}
              </div>
            </div>

            <div className="rounded-xl bg-white border p-4 mb-4">
              <h2 className="text-base font-bold text-gray-900 mb-3">💵 Sales Payment Breakdown</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cash</span>
                  <span className="font-semibold text-green-700">₹{salesCash.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Online (UPI/Bank)</span>
                  <span className="font-semibold text-blue-700">₹{salesOnline.toFixed(0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Due (Baki)</span>
                  <span className="font-semibold text-red-700">₹{salesDue.toFixed(0)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white border p-4 mb-4">
              <h2 className="text-base font-bold text-gray-900 mb-3">🛒 Purchase Payment Breakdown</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cash</span>
                  <span className="font-semibold text-green-700">₹{purchCash.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Online (UPI/Bank)</span>
                  <span className="font-semibold text-blue-700">₹{purchOnline.toFixed(0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Due (Baki)</span>
                  <span className="font-semibold text-red-700">₹{purchDue.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
