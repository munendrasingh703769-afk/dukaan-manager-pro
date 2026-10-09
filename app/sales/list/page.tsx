'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'

type Row = {
  id: string
  invoice_no: string | null
  total_amount: number
  cash_amount: number
  online_amount: number
  paid_amount: number
  due_amount: number
  payment_method: string | null
  sale_date: string
  customer_name: string
}

let BUSINESS_ID = ''

export default function SalesListPage() {
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

    const { data: sales, error: sErr } = await supabase
      .from('sales')
      .select('id, invoice_no, total_amount, cash_amount, online_amount, paid_amount, due_amount, payment_method, sale_date, customer_id')
      .eq('business_id', bizId())
      .order('sale_date', { ascending: false })

    if (sErr) {
      setError(sErr.message)
      setLoading(false)
      return
    }

    const { data: custs } = await supabase.from('customers').select('id, name').eq('business_id', bizId())
    const map: Record<string, string> = {}
    ;(custs ?? []).forEach((c: any) => { map[c.id] = c.name })

    setRows(
      (sales ?? []).map((s: any) => ({
        id: s.id,
        invoice_no: s.invoice_no,
        total_amount: Number(s.total_amount || 0),
        cash_amount: Number(s.cash_amount || 0),
        online_amount: Number(s.online_amount || 0),
        paid_amount: Number(s.paid_amount || 0),
        due_amount: Number(s.due_amount || 0),
        payment_method: s.payment_method,
        sale_date: s.sale_date,
        customer_name: s.customer_id ? map[s.customer_id] || '-' : '-',
      }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteRow(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this sale?')) return
    const { error } = await supabase.from('sales').delete().eq('id', id)
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
        <h1 className="text-2xl font-bold">Sales List</h1>
        <Link href="/sales" className="text-blue-600 text-sm">
          + New Sale
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
        <p className="mt-4 text-gray-500">Koi sale nahi hai abhi.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/sales/${row.id}`}
              className="block rounded border p-3 bg-white hover:bg-gray-50"
            >
              <div className="flex justify-between">
                <span className="font-semibold">{row.invoice_no || 'No Invoice'}</span>
                <span className="text-sm text-gray-500">
                  {new Date(row.sale_date).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-700">
                Customer: {row.customer_name}
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
