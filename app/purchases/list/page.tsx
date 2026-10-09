'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'

type Row = {
  id: string
  bill_no: string | null
  total_amount: number
  cash_amount: number
  online_amount: number
  paid_amount: number
  due_amount: number
  payment_method: string | null
  created_at: string
  supplier_name: string
}

let BUSINESS_ID = ''

export default function PurchaseListPage() {
  if (typeof window !== 'undefined' && !BUSINESS_ID) {
    BUSINESS_ID = getCurrentBusinessId() || 'fc98ba38-bf25-4268-98ba-aad43ecfa6d3'
  }
  const supabase = createClient()
  
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const { data: purchases, error: pErr } = await supabase
      .from('purchases')
      .select('id, bill_no, total_amount, cash_amount, online_amount, paid_amount, due_amount, payment_method, created_at, supplier_id')
      .eq('business_id', bizId())
      .order('created_at', { ascending: false })
      .limit(100)

    if (pErr) {
      setError(pErr.message)
      setLoading(false)
      return
    }

    const { data: sups } = await supabase.from('suppliers').select('id, name').eq('business_id', bizId())
    const map: Record<string, string> = {}
    ;(sups ?? []).forEach((s: any) => { map[s.id] = s.name })

    setRows(
      (purchases ?? []).map((p: any) => ({
        id: p.id,
        bill_no: p.bill_no,
        total_amount: Number(p.total_amount || 0),
        cash_amount: Number(p.cash_amount || 0),
        online_amount: Number(p.online_amount || 0),
        paid_amount: Number(p.paid_amount || 0),
        due_amount: Number(p.due_amount || 0),
        payment_method: p.payment_method,
        created_at: p.created_at,
        supplier_name: p.supplier_id ? map[p.supplier_id] || '-' : '-',
      }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteRow(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this purchase?')) return
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  const cashTotal = rows.reduce((s, r) => s + r.cash_amount, 0)
  const onlineTotal = rows.reduce((s, r) => s + r.online_amount, 0)
  const dueTotal = rows.reduce((s, r) => s + r.due_amount, 0)

  return (
    <main className="p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Purchase List</h1>
        <Link href="/purchases" className="text-blue-600 text-sm">
          + New
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded border p-2 bg-green-50">
          <div className="text-xs text-gray-600">Cash</div>
          <div className="font-bold text-green-700">₹{cashTotal.toFixed(0)}</div>
        </div>
        <div className="rounded border p-2 bg-blue-50">
          <div className="text-xs text-gray-600">Online</div>
          <div className="font-bold text-blue-700">₹{onlineTotal.toFixed(0)}</div>
        </div>
        <div className="rounded border p-2 bg-red-50">
          <div className="text-xs text-gray-600">Due</div>
          <div className="font-bold text-red-700">₹{dueTotal.toFixed(0)}</div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-gray-500">Koi purchase nahi hai abhi.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/purchases/${row.id}`}
              className="block rounded border p-3 bg-white hover:bg-gray-50"
            >
              <div className="flex justify-between">
                <span className="font-semibold">{row.bill_no || 'No Bill'}</span>
                <span className="text-sm text-gray-500">
                  {new Date(row.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-700">
                Supplier: {row.supplier_name}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="text-green-700">Cash: ₹{row.cash_amount.toFixed(0)}</div>
                <div className="text-blue-700">Online: ₹{row.online_amount.toFixed(0)}</div>
                <div className={row.due_amount > 0 ? 'text-red-600' : 'text-gray-500'}>
                  Due: ₹{row.due_amount.toFixed(0)}
                </div>
              </div>
              <div className="mt-1 flex justify-between items-center">
                <span className="text-sm font-semibold">
                  Total: ₹{row.total_amount.toFixed(0)}
                </span>
                <button
                  type="button"
                  onClick={(e) => deleteRow(e, row.id)}
                  className="rounded bg-red-600 px-3 py-1 text-white text-xs"
                >
                  Delete
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
