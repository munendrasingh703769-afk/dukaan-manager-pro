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

type TopProduct = { name: string; qty: number; amount: number }
type TopCustomer = { id: string; name: string; amount: number; count: number }
type DueItem = { id: string; name: string; due: number }
type StockItem = { name: string; qty: number; unit: string; value: number }

export default function ReportsPage() {
  const supabase = createClient()

  const [sales, setSales] = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState<RangeKey>('month')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [customerDue, setCustomerDue] = useState<DueItem[]>([])
  const [supplierDue, setSupplierDue] = useState<DueItem[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])

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

  useEffect(() => {
    loadExtended()
  }, [range, fromDate, toDate])

  async function loadExtended() {
    const bid = bizId()
    if (!bid) return

    const { from, to } = getDateRange()

    // 1. Top Products
    const { data: salesIdData } = await supabase
      .from('sales')
      .select('id')
      .eq('business_id', bid)
      .gte('sale_date', from)
      .lte('sale_date', to)

    const saleIds = (salesIdData ?? []).map((s: any) => s.id)

    if (saleIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('sale_items')
        .select('product_name, qty, line_total')
        .in('sale_id', saleIds)

      const productMap: Record<string, TopProduct> = {}
      ;(itemsData ?? []).forEach((it: any) => {
        const name = it.product_name || 'Unknown'
        if (!productMap[name]) productMap[name] = { name, qty: 0, amount: 0 }
        productMap[name].qty += Number(it.qty || 0)
        productMap[name].amount += Number(it.line_total || 0)
      })
      setTopProducts(
        Object.values(productMap).sort((a, b) => b.amount - a.amount).slice(0, 5)
      )
    } else {
      setTopProducts([])
    }

    // 2. Top Customers
    const { data: salesCustData } = await supabase
      .from('sales')
      .select('customer_id, total_amount')
      .eq('business_id', bid)
      .gte('sale_date', from)
      .lte('sale_date', to)
      .not('customer_id', 'is', null)

    const custMap: Record<string, { amount: number; count: number }> = {}
    ;(salesCustData ?? []).forEach((s: any) => {
      if (!custMap[s.customer_id]) custMap[s.customer_id] = { amount: 0, count: 0 }
      custMap[s.customer_id].amount += Number(s.total_amount || 0)
      custMap[s.customer_id].count += 1
    })

    const custIds = Object.keys(custMap)
    if (custIds.length > 0) {
      const { data: custData } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', custIds)

      const custNames: Record<string, string> = {}
      ;(custData ?? []).forEach((c: any) => { custNames[c.id] = c.name })

      setTopCustomers(
        custIds
          .map((id) => ({
            id,
            name: custNames[id] || 'Unknown',
            amount: custMap[id].amount,
            count: custMap[id].count,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
      )
    } else {
      setTopCustomers([])
    }

    // 3. Customer Due
    const { data: dueSales } = await supabase
      .from('sales')
      .select('customer_id, due_amount')
      .eq('business_id', bid)
      .gt('due_amount', 0)

    const dueMap: Record<string, number> = {}
    ;(dueSales ?? []).forEach((s: any) => {
      if (s.customer_id) {
        dueMap[s.customer_id] = (dueMap[s.customer_id] || 0) + Number(s.due_amount || 0)
      }
    })
    const dueIds = Object.keys(dueMap)
    if (dueIds.length > 0) {
      const { data: custData2 } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', dueIds)
      const custNames2: Record<string, string> = {}
      ;(custData2 ?? []).forEach((c: any) => { custNames2[c.id] = c.name })
      setCustomerDue(
        dueIds
          .map((id) => ({ id, name: custNames2[id] || 'Unknown', due: dueMap[id] }))
          .sort((a, b) => b.due - a.due)
          .slice(0, 10)
      )
    } else {
      setCustomerDue([])
    }

    // 4. Supplier Due
    const { data: duePurch } = await supabase
      .from('purchases')
      .select('supplier_id, due_amount')
      .eq('business_id', bid)
      .gt('due_amount', 0)

    const suppMap: Record<string, number> = {}
    ;(duePurch ?? []).forEach((p: any) => {
      if (p.supplier_id) {
        suppMap[p.supplier_id] = (suppMap[p.supplier_id] || 0) + Number(p.due_amount || 0)
      }
    })
    const suppIds = Object.keys(suppMap)
    if (suppIds.length > 0) {
      const { data: suppData } = await supabase
        .from('suppliers')
        .select('id, name')
        .in('id', suppIds)
      const suppNames: Record<string, string> = {}
      ;(suppData ?? []).forEach((s: any) => { suppNames[s.id] = s.name })
      setSupplierDue(
        suppIds
          .map((id) => ({ id, name: suppNames[id] || 'Unknown', due: suppMap[id] }))
          .sort((a, b) => b.due - a.due)
          .slice(0, 10)
      )
    } else {
      setSupplierDue([])
    }

    // 5. Stock Summary
    const { data: stockData } = await supabase
      .from('products')
      .select('name, stock_qty, unit, purchase_price')
      .eq('business_id', bid)
      .gt('stock_qty', 0)
      .order('stock_qty', { ascending: false })
      .limit(10)

    setStockItems(
      (stockData ?? []).map((p: any) => ({
        name: p.name,
        qty: Number(p.stock_qty || 0),
        unit: p.unit || 'PCS',
        value: Number(p.stock_qty || 0) * Number(p.purchase_price || 0),
      }))
    )
  }
  function exportCSV() {
    const rows: string[][] = []

    // Summary
    rows.push(['REPORT SUMMARY'])
    rows.push(['Range', range])
    rows.push(['Sales Total', String(salesTotal)])
    rows.push(['Sales Bills', String(sales.length)])
    rows.push(['Purchase Total', String(purchTotal)])
    rows.push(['Purchase Bills', String(purchases.length)])
    rows.push(['Profit', String(profit)])
    rows.push([])

    // Sales Payment
    rows.push(['SALES PAYMENT BREAKDOWN'])
    rows.push(['Cash', String(salesCash)])
    rows.push(['Online', String(salesOnline)])
    rows.push(['Due', String(salesDue)])
    rows.push([])

    // Purchase Payment
    rows.push(['PURCHASE PAYMENT BREAKDOWN'])
    rows.push(['Cash', String(purchCash)])
    rows.push(['Online', String(purchOnline)])
    rows.push(['Due', String(purchDue)])
    rows.push([])

    // Top Products
    if (topProducts.length > 0) {
      rows.push(['TOP 5 PRODUCTS'])
      rows.push(['Rank', 'Product', 'Qty', 'Amount'])
      topProducts.forEach((p, i) => {
        rows.push([String(i + 1), p.name, String(p.qty), String(p.amount)])
      })
      rows.push([])
    }

    // Top Customers
    if (topCustomers.length > 0) {
      rows.push(['TOP 5 CUSTOMERS'])
      rows.push(['Rank', 'Customer', 'Bills', 'Amount'])
      topCustomers.forEach((c, i) => {
        rows.push([String(i + 1), c.name, String(c.count), String(c.amount)])
      })
      rows.push([])
    }

    // Customer Due
    if (customerDue.length > 0) {
      rows.push(['CUSTOMER UDHAAR (BAKI)'])
      rows.push(['Customer', 'Due'])
      customerDue.forEach((c) => {
        rows.push([c.name, String(c.due)])
      })
      rows.push([])
    }

    // Supplier Due
    if (supplierDue.length > 0) {
      rows.push(['SUPPLIER DUE (DENA)'])
      rows.push(['Supplier', 'Due'])
      supplierDue.forEach((s) => {
        rows.push([s.name, String(s.due)])
      })
      rows.push([])
    }

    // Stock Summary
    if (stockItems.length > 0) {
      rows.push(['STOCK SUMMARY'])
      rows.push(['Product', 'Qty', 'Unit', 'Value'])
      stockItems.forEach((s) => {
        rows.push([s.name, String(s.qty), s.unit, String(s.value)])
      })
      rows.push([])
    }

    // CSV banao
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? '')
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
              return '"' + s.replace(/"/g, '""') + '"'
            }
            return s
          })
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reports-${range}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
        <div className="flex justify-between items-center mb-4 gap-2">
          <h1 className="text-2xl font-bold text-gray-900">📊 Reports</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCSV}
              disabled={loading}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              📥 Export CSV
            </button>
            <Link href="/" className="text-sm text-blue-600 self-center">← Home</Link>
          </div>
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

            {topProducts.length > 0 && (
              <div className="rounded-xl bg-white border p-4 mb-4">
                <h2 className="text-base font-bold text-gray-900 mb-3">🏆 Top 5 Products</h2>
                <div className="space-y-2 text-sm">
                  {topProducts.map((p, i) => (
                    <div key={i} className="flex justify-between items-center border-b last:border-b-0 pb-1.5">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{i + 1}. {p.name}</div>
                        <div className="text-xs text-gray-500">{p.qty} units</div>
                      </div>
                      <div className="font-semibold text-green-700">₹{p.amount.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topCustomers.length > 0 && (
              <div className="rounded-xl bg-white border p-4 mb-4">
                <h2 className="text-base font-bold text-gray-900 mb-3">👥 Top 5 Customers</h2>
                <div className="space-y-2 text-sm">
                  {topCustomers.map((c, i) => (
                    <div key={c.id} className="flex justify-between items-center border-b last:border-b-0 pb-1.5">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{i + 1}. {c.name}</div>
                        <div className="text-xs text-gray-500">{c.count} bills</div>
                      </div>
                      <div className="font-semibold text-blue-700">₹{c.amount.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customerDue.length > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-4">
                <h2 className="text-base font-bold text-red-800 mb-3">📉 Customer Udhaar (Baki)</h2>
                <div className="space-y-2 text-sm">
                  {customerDue.map((c) => (
                    <div key={c.id} className="flex justify-between items-center border-b border-red-200 last:border-b-0 pb-1.5">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="font-semibold text-red-700">₹{c.due.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {supplierDue.length > 0 && (
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 mb-4">
                <h2 className="text-base font-bold text-orange-800 mb-3">📉 Supplier Due (Dena)</h2>
                <div className="space-y-2 text-sm">
                  {supplierDue.map((s) => (
                    <div key={s.id} className="flex justify-between items-center border-b border-orange-200 last:border-b-0 pb-1.5">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="font-semibold text-orange-700">₹{s.due.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stockItems.length > 0 && (
              <div className="rounded-xl bg-white border p-4 mb-4">
                <h2 className="text-base font-bold text-gray-900 mb-3">📦 Stock Summary</h2>
                <div className="space-y-2 text-sm">
                  {stockItems.map((s, i) => (
                    <div key={i} className="flex justify-between items-center border-b last:border-b-0 pb-1.5">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.qty} {s.unit}</div>
                      </div>
                      <div className="font-semibold text-purple-700">₹{s.value.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </>
        )}
      </div>
    </main>
  )
}

